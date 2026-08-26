import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  getBalance,
  getMarketLimits,
  getShippingFee,
  signProductPhotos,
  ORDER_ACTIVE_STATUSES,
} from "./market.server";
import { buildMessage, rupiah, sendWhatsappNotification } from "./whatsapp.server";

const ORDER_SELECT =
  "id, method, address, shipping_fee, items_total, total_amount, paid_from_balance, cash_due, status, admin_note, proof_url, received_at, locked, created_at, market_order_items(product_name, unit, price, qty, subtotal), market_order_events(status, note, created_at)";

/** Katalog produk aktif + saldo warga + tarif ongkir + batas pembelian. */
export const getMarketCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: products }, balance, shippingFee, limits, { data: profile }, { count: activeOrders }] =
      await Promise.all([
        supabase
          .from("market_products")
          .select("id, name, category, unit, price, stock, photo_url")
          .eq("is_active", true)
          .order("category", { ascending: true })
          .order("name", { ascending: true }),
        getBalance(supabase, userId),
        getShippingFee(supabase),
        getMarketLimits(supabase),
        supabase.from("profiles").select("address").eq("id", userId).single(),
        supabase
          .from("market_orders")
          .select("id", { count: "exact", head: true })
          .eq("resident_id", userId)
          .in("status", ORDER_ACTIVE_STATUSES),
      ]);
    return {
      products: await signProductPhotos(supabase, products ?? []),
      balance,
      shippingFee,
      limits,
      activeOrders: activeOrders ?? 0,
      address: profile?.address ?? "",
    };
  });

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("market_orders")
      .select(ORDER_SELECT)
      .eq("resident_id", context.userId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((o) => ({
      ...o,
      market_order_events: [...(o.market_order_events ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    }));
  });

export const createMarketOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        method: z.enum(["antar", "ambil"]),
        address: z.string().trim().max(255).optional().nullable(),
        items: z
          .array(
            z.object({
              productId: z.string().uuid(),
              qty: z.number().int().positive().max(99),
            }),
          )
          .min(1, "Keranjang masih kosong")
          .max(30),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.method === "antar" && (!data.address || data.address.trim().length < 5)) {
      throw new Error("Alamat pengantaran wajib diisi minimal 5 karakter.");
    }

    const limits = await getMarketLimits(supabase);
    const { count: activeOrders } = await supabase
      .from("market_orders")
      .select("id", { count: "exact", head: true })
      .eq("resident_id", userId)
      .in("status", ORDER_ACTIVE_STATUSES);
    if ((activeOrders ?? 0) >= limits.maxActiveOrders) {
      throw new Error(
        `Anda masih punya ${activeOrders} pesanan berjalan. Selesaikan dulu (maksimal ${limits.maxActiveOrders} pesanan aktif).`,
      );
    }

    const ids = data.items.map((i) => i.productId);
    const { data: products } = await supabase
      .from("market_products")
      .select("id, name, unit, price, stock, is_active")
      .in("id", ids);

    // Harga, stok, batas, dan ongkir selalu dihitung ulang di server.
    const lines = data.items.map((item) => {
      const p = (products ?? []).find((x) => x.id === item.productId);
      if (!p || !p.is_active) throw new Error("Ada produk yang sudah tidak tersedia.");
      if (item.qty > limits.maxQtyPerProduct) {
        throw new Error(`Maksimal ${limits.maxQtyPerProduct} ${p.unit} per produk untuk tiap warga.`);
      }
      if (p.stock < item.qty) throw new Error(`Stok ${p.name} tinggal ${p.stock}.`);
      const price = Number(p.price);
      return {
        product_id: p.id,
        product_name: p.name,
        unit: p.unit,
        price,
        qty: item.qty,
        subtotal: price * item.qty,
      };
    });

    const itemsTotal = lines.reduce((s, l) => s + l.subtotal, 0);
    const shippingFee = data.method === "antar" ? await getShippingFee(supabase) : 0;
    const totalAmount = itemsTotal + shippingFee;

    const balance = await getBalance(supabase, userId);
    const paidFromBalance = Math.max(0, Math.min(balance, totalAmount));
    const cashDue = totalAmount - paidFromBalance;

    // Stok dikunci (reserved) saat pesanan dibuat agar tidak dipesan ganda.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const reserved: { id: string; qty: number }[] = [];
    try {
      for (const l of lines) {
        const { data: fresh } = await supabaseAdmin
          .from("market_products")
          .select("stock")
          .eq("id", l.product_id)
          .single();
        const current = Number(fresh?.stock ?? 0);
        if (current < l.qty) throw new Error(`Stok ${l.product_name} tinggal ${current}.`);
        const { error: stockErr } = await supabaseAdmin
          .from("market_products")
          .update({ stock: current - l.qty })
          .eq("id", l.product_id)
          .gte("stock", l.qty);
        if (stockErr) throw new Error(stockErr.message);
        reserved.push({ id: l.product_id, qty: l.qty });
      }

      const { data: order, error } = await supabase
        .from("market_orders")
        .insert({
          resident_id: userId,
          method: data.method,
          address: data.method === "antar" ? (data.address ?? "").trim() : null,
          shipping_fee: shippingFee,
          items_total: itemsTotal,
          total_amount: totalAmount,
          paid_from_balance: paidFromBalance,
          cash_due: cashDue,
          status: "menunggu",
        })
        .select("id")
        .single();
      if (error || !order) throw new Error(error?.message ?? "Gagal membuat pesanan");

      const { error: itemError } = await supabase
        .from("market_order_items")
        .insert(lines.map((l) => ({ ...l, order_id: order.id })));
      if (itemError) throw new Error(itemError.message);

      await supabase.from("market_order_events").insert({
        order_id: order.id,
        status: "menunggu",
        note: "Pesanan dibuat warga, menunggu verifikasi admin.",
        created_by: userId,
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", userId)
        .single();
      if (profile?.phone) {
        await sendWhatsappNotification(supabase, {
          phone: profile.phone,
          name: profile.full_name,
          event: "pesanan_marketplace",
          message: buildMessage("pesanan_marketplace", {
            rincian: lines.map((l) => `${l.product_name} x${l.qty}`).join(", "),
            total: rupiah(totalAmount),
            saldo: rupiah(paidFromBalance),
            tunai: rupiah(cashDue),
            metode: data.method === "antar" ? "Diantar petugas" : "Ambil di kantor",
          }),
        });
      }

      return { ok: true, orderId: order.id, paidFromBalance, cashDue, totalAmount };
    } catch (err) {
      // Kembalikan stok yang sempat dikunci bila pesanan gagal dibuat.
      for (const r of reserved) {
        const { data: fresh } = await supabaseAdmin
          .from("market_products")
          .select("stock")
          .eq("id", r.id)
          .single();
        await supabaseAdmin
          .from("market_products")
          .update({ stock: Number(fresh?.stock ?? 0) + r.qty })
          .eq("id", r.id);
      }
      throw err;
    }
  });

/** Warga mengonfirmasi barang sudah diterima; pesanan dikunci setelahnya. */
export const confirmOrderReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orderId: z.string().uuid(),
        proofUrl: z.string().trim().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await supabase
      .from("market_orders")
      .select("id, status, locked, resident_id")
      .eq("id", data.orderId)
      .eq("resident_id", userId)
      .single();
    if (!order) throw new Error("Pesanan tidak ditemukan.");
    if (order.locked || order.status === "diterima") throw new Error("Pesanan sudah dikunci.");
    if (order.status === "dibatalkan") throw new Error("Pesanan sudah dibatalkan.");
    if (!["dikirim", "diproses"].includes(order.status)) {
      throw new Error("Pesanan belum dikirim, belum bisa dikonfirmasi diterima.");
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("market_orders")
      .update({
        status: "diterima",
        locked: true,
        received_at: now,
        proof_url: data.proofUrl ?? null,
      })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);

    await supabase.from("market_order_events").insert({
      order_id: data.orderId,
      status: "diterima",
      note: data.proofUrl ? "Warga konfirmasi terima (dengan bukti foto)." : "Warga konfirmasi barang diterima.",
      created_by: userId,
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", userId)
      .single();
    if (profile?.phone) {
      await sendWhatsappNotification(supabase, {
        phone: profile.phone,
        name: profile.full_name,
        event: "status_pesanan",
        message: buildMessage("status_pesanan", {
          kode: data.orderId.slice(0, 8).toUpperCase(),
          status: "Diterima",
          catatan: "Terima kasih telah berbelanja di Bank Sampah LESTARI MAGETAN.",
        }),
      });
    }
    return { ok: true };
  });
