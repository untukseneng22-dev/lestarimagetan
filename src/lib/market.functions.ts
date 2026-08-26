import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getBalance, getShippingFee, signProductPhotos } from "./market.server";
import { buildMessage, rupiah, sendWhatsappNotification } from "./whatsapp.server";

/** Katalog produk aktif + saldo warga + tarif ongkir. */
export const getMarketCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: products }, balance, shippingFee, { data: profile }] = await Promise.all([
      supabase
        .from("market_products")
        .select("id, name, category, unit, price, stock, photo_url")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true }),
      getBalance(supabase, userId),
      getShippingFee(supabase),
      supabase.from("profiles").select("address").eq("id", userId).single(),
    ]);
    return {
      products: await signProductPhotos(supabase, products ?? []),
      balance,
      shippingFee,
      address: profile?.address ?? "",
    };
  });

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("market_orders")
      .select(
        "id, method, address, shipping_fee, items_total, total_amount, paid_from_balance, cash_due, status, admin_note, created_at, market_order_items(product_name, unit, price, qty, subtotal)",
      )
      .eq("resident_id", context.userId)
      .order("created_at", { ascending: false });
    return data ?? [];
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

    const ids = data.items.map((i) => i.productId);
    const { data: products } = await supabase
      .from("market_products")
      .select("id, name, unit, price, stock, is_active")
      .in("id", ids);

    // Harga, stok, dan ongkir selalu dihitung ulang di server.
    const lines = data.items.map((item) => {
      const p = (products ?? []).find((x) => x.id === item.productId);
      if (!p || !p.is_active) throw new Error("Ada produk yang sudah tidak tersedia.");
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
      })
      .select("id")
      .single();
    if (error || !order) throw new Error(error?.message ?? "Gagal membuat pesanan");

    const { error: itemError } = await supabase
      .from("market_order_items")
      .insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (itemError) throw new Error(itemError.message);

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
  });
