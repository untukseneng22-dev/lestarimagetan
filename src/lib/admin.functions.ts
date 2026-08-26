import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getBalance, getPricesAtDate, ORDER_CHARGED_STATUSES, requireRole } from "./data.server";
import { ADMIN_ORDER_SELECT, getMarketLimits, getShippingFee, ORDER_STATUS_TEXT, signProductPhotos, withResidentInfo } from "./market.server";
import { buildMessage, rupiah, sendWhatsappNotification } from "./whatsapp.server";

// ---------- Statistik dashboard ----------
export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = await Promise.resolve(context);
    await requireRole(supabase, userId, ["admin"]);

    const monthStart = new Date();
    monthStart.setDate(1);
    const monthISO = monthStart.toISOString().slice(0, 10);

    const [
      { data: roles },
      { data: txMonth },
      { data: txAll },
      { count: pendingWithdrawals },
      { count: openComplaints },
      { count: activePickups },
    ] = await Promise.all([
      supabase.from("user_roles").select("role"),
      supabase.from("transactions").select("total_amount, total_weight").gte("deposit_date", monthISO),
      supabase.from("transactions").select("total_amount"),
      supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "menunggu"),
      supabase.from("complaints").select("id", { count: "exact", head: true }).in("status", ["baru", "diproses"]),
      supabase.from("pickup_tasks").select("id", { count: "exact", head: true }).in("status", ["menunggu", "dijadwalkan", "dalam_perjalanan"]),
    ]);

    const countRole = (r: string) => (roles ?? []).filter((x) => x.role === r).length;
    return {
      totalWarga: countRole("warga"),
      totalTim: countRole("tim"),
      setoranBulanIni: (txMonth ?? []).length,
      beratBulanIni: (txMonth ?? []).reduce((s, t) => s + Number(t.total_weight), 0),
      nilaiBulanIni: (txMonth ?? []).reduce((s, t) => s + Number(t.total_amount), 0),
      totalSaldoWarga: (txAll ?? []).reduce((s, t) => s + Number(t.total_amount), 0),
      pendingWithdrawals: pendingWithdrawals ?? 0,
      openComplaints: openComplaints ?? 0,
      activePickups: activePickups ?? 0,
    };
  });

// ---------- Manajemen pengguna ----------
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ role: z.enum(["warga", "tim", "admin"]) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { data: roleRows } = await supabase.from("user_roles").select("user_id").eq("role", data.role);
    const ids = (roleRows ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, phone, address, rt, created_at")
      .in("id", ids)
      .order("full_name");

    // Petakan email internal (username@banksampah.id) -> username untuk ditampilkan
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const usernameMap = new Map(
      (authData?.users ?? []).map((u) => {
        const email = u.email ?? "";
        const username = email.endsWith("@banksampah.id") ? email.replace(/@banksampah\.id$/, "") : email;
        return [u.id, username] as const;
      }),
    );

    return (profiles ?? []).map((p) => ({ ...p, username: usernameMap.get(p.id) ?? "-" }));
  });

export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        role: z.enum(["warga", "tim"]),
        fullName: z.string().trim().min(3).max(100),
        phone: z.string().trim().regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid"),
        address: z.string().trim().min(3).max(255),
        rt: z.string().trim().max(20).optional(),
        username: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9_.]{3,30}$/, "Username 3-30 karakter: huruf kecil, angka, titik, atau garis bawah"),
        password: z.string().min(6, "Kata sandi minimal 6 karakter").max(72),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);

    const email = `${data.username}@banksampah.id`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      full_name: data.fullName,
      phone: data.phone,
      address: data.address,
      rt: data.rt ?? null,
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });

    if (data.role === "warga") {
      await sendWhatsappNotification(supabase, {
        phone: data.phone,
        name: data.fullName,
        event: "akun_baru",
        message: buildMessage("akun_baru", {
          nama: data.fullName,
          username: data.username,
          password: data.password,
        }),
      });
    }
    return { ok: true, userId: created.user.id };
  });

export const updateUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        fullName: z.string().trim().min(3).max(100),
        phone: z.string().trim().max(20).optional(),
        address: z.string().trim().max(255).optional(),
        rt: z.string().trim().max(20).optional(),
        username: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9_.]{3,30}$/, "Username 3-30 karakter: huruf kecil, angka, titik, atau garis bawah"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone || null,
        address: data.address || null,
        rt: data.rt || null,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    // Jika username berubah, perbarui email internal di auth
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const newEmail = `${data.username}@banksampah.id`;
    if (target?.user && target.user.email !== newEmail) {
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        email: newEmail,
        email_confirm: true,
      });
      if (emailError) throw new Error(`Profil tersimpan, tetapi username gagal diubah: ${emailError.message}`);
    }
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        password: z.string().min(6, "Kata sandi minimal 6 karakter").max(72),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);

    // Kirim kredensial baru via WhatsApp bila warga punya nomor
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", data.userId)
      .single();
    const email = target?.user?.email ?? "";
    const username = email.endsWith("@banksampah.id") ? email.replace(/@banksampah\.id$/, "") : email;
    if (profile?.phone) {
      await sendWhatsappNotification(supabase, {
        phone: profile.phone,
        name: profile.full_name,
        event: "reset_sandi",
        message: buildMessage("reset_sandi", {
          nama: profile.full_name,
          username,
          password: data.password,
        }),
      });
    }
    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);

    if (data.userId === userId) throw new Error("Anda tidak dapat menghapus akun sendiri.");

    // Cegah menghapus admin terakhir
    const { data: targetRoles } = await supabase.from("user_roles").select("role").eq("user_id", data.userId);
    if ((targetRoles ?? []).some((r) => r.role === "admin")) {
      const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if ((adminRoles ?? []).length <= 1) throw new Error("Tidak dapat menghapus admin terakhir.");
    }

    // Tolak penghapusan bila akun masih punya riwayat agar data laporan tetap utuh
    const [tx, complaints, withdrawals, pickups, priceLogs] = await Promise.all([
      supabase.from("transactions").select("id", { count: "exact", head: true }).or(`resident_id.eq.${data.userId},recorded_by.eq.${data.userId}`),
      supabase.from("complaints").select("id", { count: "exact", head: true }).eq("resident_id", data.userId),
      supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("resident_id", data.userId),
      supabase.from("pickup_tasks").select("id", { count: "exact", head: true }).or(`resident_id.eq.${data.userId},assigned_to.eq.${data.userId}`),
      supabase.from("price_history").select("id", { count: "exact", head: true }).eq("changed_by", data.userId),
    ]);
    const historyCount =
      (tx.count ?? 0) + (complaints.count ?? 0) + (withdrawals.count ?? 0) + (pickups.count ?? 0) + (priceLogs.count ?? 0);
    if (historyCount > 0) {
      throw new Error(
        "Akun tidak dapat dihapus karena masih memiliki riwayat (transaksi, aduan, pencairan, atau penjemputan). Hapus riwayat tersebut terlebih dahulu atau nonaktifkan dengan mengganti kata sandinya.",
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("announcements").update({ created_by: null }).eq("created_by", data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Harga sampah ----------
export const listCategoriesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    return getPricesAtDate(supabase);
  });

export const createCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        name: z.string().trim().min(2).max(100),
        unit: z.string().trim().min(1).max(20),
        price: z.number().min(0).max(100_000_000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { data: cat, error } = await supabase
      .from("waste_categories")
      .insert({ name: data.name, unit: data.unit })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: priceError } = await supabase
      .from("price_history")
      .insert({ category_id: cat.id, price_per_kg: data.price, changed_by: userId });
    if (priceError) throw new Error(priceError.message);
    return { ok: true };
  });

export const updateCategoryPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ categoryId: z.string().uuid(), price: z.number().min(0).max(100_000_000) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { error } = await supabase.from("price_history").insert({
      category_id: data.categoryId,
      price_per_kg: data.price,
      changed_by: userId,
      effective_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPriceHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { data } = await supabase
      .from("price_history")
      .select("id, category_id, price_per_kg, effective_at, waste_categories(name, unit)")
      .order("effective_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

// ---------- Transaksi ----------
export const listTransactionsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    let query = supabase
      .from("transactions")
      .select("id, resident_id, recorded_by, deposit_date, total_weight, total_amount, created_at, transaction_items(category_name, weight_kg, price_per_kg, subtotal)")
      .order("deposit_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.from) query = query.gte("deposit_date", data.from);
    if (data.to) query = query.lte("deposit_date", data.to);
    const { data: rows } = await query;
    const list = rows ?? [];
    const ids = [...new Set(list.flatMap((r) => [r.resident_id, r.recorded_by]).filter(Boolean))] as string[];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] };
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    return list.map((r) => ({
      ...r,
      resident_name: nameMap.get(r.resident_id) ?? "-",
      recorded_by_name: r.recorded_by ? (nameMap.get(r.recorded_by) ?? "-") : "-",
    }));
  });

// ---------- Aduan ----------
export const listComplaintsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { data } = await supabase
      .from("complaints")
      .select("id, resident_id, title, description, photo_url, status, response, created_at, updated_at")
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    const ids = [...new Set(rows.map((r) => r.resident_id))];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name, phone").in("id", ids)
      : { data: [] };
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return Promise.all(
      rows.map(async (r) => {
        let photoSigned: string | null = null;
        if (r.photo_url) {
          const { data: s } = await supabase.storage.from("aduan").createSignedUrl(r.photo_url, 3600);
          photoSigned = s?.signedUrl ?? null;
        }
        return {
          ...r,
          photo_signed_url: photoSigned,
          resident_name: map.get(r.resident_id)?.full_name ?? "-",
          resident_phone: map.get(r.resident_id)?.phone ?? null,
        };
      }),
    );
  });

export const respondComplaint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        complaintId: z.string().uuid(),
        status: z.enum(["baru", "diproses", "selesai"]),
        response: z.string().trim().max(1000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);

    const { data: complaint } = await supabase
      .from("complaints")
      .select("resident_id, title")
      .eq("id", data.complaintId)
      .single();

    const { error } = await supabase
      .from("complaints")
      .update({
        status: data.status,
        response: data.response ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.complaintId);
    if (error) throw new Error(error.message);

    if (complaint?.resident_id) {
      const { data: resident } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", complaint.resident_id)
        .single();
      const labels: Record<string, string> = { baru: "Baru", diproses: "Diproses", selesai: "Selesai" };
      await sendWhatsappNotification(supabase, {
        phone: resident?.phone ?? "-",
        name: resident?.full_name ?? null,
        event: "status_aduan",
        message: buildMessage("status_aduan", {
          judul: complaint.title,
          status: labels[data.status] ?? data.status,
          tanggapan: data.response ?? "",
        }),
      });
    }
    return { ok: true };
  });

// ---------- Pengumuman ----------
export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        title: z.string().trim().min(5).max(150),
        body: z.string().trim().min(10).max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { error } = await supabase
      .from("announcements")
      .insert({ title: data.title, body: data.body, created_by: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { error } = await supabase.from("announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Kas & pencairan ----------
export const listWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { data } = await supabase
      .from("withdrawals")
      .select("id, resident_id, amount, status, note, processed_at, created_at")
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    const ids = [...new Set(rows.map((r) => r.resident_id))];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name, phone").in("id", ids)
      : { data: [] };
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));

    // Saldo per warga yang mengajukan
    const result = [];
    for (const r of rows) {
      const { data: tx } = await supabase
        .from("transactions")
        .select("total_amount")
        .eq("resident_id", r.resident_id);
      const { data: wd } = await supabase
        .from("withdrawals")
        .select("amount")
        .eq("resident_id", r.resident_id)
        .in("status", ["disetujui", "dicairkan"]);
      const balance =
        (tx ?? []).reduce((s, t) => s + Number(t.total_amount), 0) -
        (wd ?? []).reduce((s, w) => s + Number(w.amount), 0);
      result.push({
        ...r,
        resident_name: map.get(r.resident_id)?.full_name ?? "-",
        resident_phone: map.get(r.resident_id)?.phone ?? null,
        resident_balance: balance,
      });
    }
    return result;
  });

export const processWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        withdrawalId: z.string().uuid(),
        status: z.enum(["disetujui", "ditolak", "dicairkan"]),
        note: z.string().trim().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);

    const { data: wd } = await supabase
      .from("withdrawals")
      .select("resident_id, amount")
      .eq("id", data.withdrawalId)
      .single();

    const { error } = await supabase
      .from("withdrawals")
      .update({
        status: data.status,
        note: data.note ?? null,
        processed_by: userId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", data.withdrawalId);
    if (error) throw new Error(error.message);

    if (wd?.resident_id) {
      const { data: resident } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", wd.resident_id)
        .single();
      const labels: Record<string, string> = {
        disetujui: "Disetujui",
        ditolak: "Ditolak",
        dicairkan: "Dicairkan",
      };
      await sendWhatsappNotification(supabase, {
        phone: resident?.phone ?? "-",
        name: resident?.full_name ?? null,
        event: "status_pencairan",
        message: buildMessage("status_pencairan", {
          jumlah: rupiah(Number(wd.amount)),
          status: labels[data.status] ?? data.status,
          catatan: data.note ?? "",
        }),
      });
    }
    return { ok: true };
  });

// ---------- Laporan ----------
export const getReportData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("id, resident_id, deposit_date, total_weight, total_amount, transaction_items(category_name, weight_kg, price_per_kg, subtotal)")
      .gte("deposit_date", data.from)
      .lte("deposit_date", data.to)
      .order("deposit_date", { ascending: true });

    const { data: complaints } = await supabase
      .from("complaints")
      .select("id, resident_id, title, status, created_at")
      .gte("created_at", `${data.from}T00:00:00+07:00`)
      .lte("created_at", `${data.to}T23:59:59+07:00`)
      .order("created_at", { ascending: true });

    const txRows = transactions ?? [];
    const ids = [
      ...new Set([
        ...txRows.map((r) => r.resident_id),
        ...(complaints ?? []).map((c) => c.resident_id),
      ]),
    ];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] };
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    const perCategory = new Map<string, { weight: number; amount: number; count: number }>();
    for (const t of txRows) {
      for (const item of (t as { transaction_items?: { category_name: string; weight_kg: number; subtotal: number }[] }).transaction_items ?? []) {
        const cur = perCategory.get(item.category_name) ?? { weight: 0, amount: 0, count: 0 };
        cur.weight += Number(item.weight_kg);
        cur.amount += Number(item.subtotal);
        cur.count += 1;
        perCategory.set(item.category_name, cur);
      }
    }

    return {
      from: data.from,
      to: data.to,
      transactions: txRows.map((r) => ({
        id: r.id,
        date: r.deposit_date,
        residentName: nameMap.get(r.resident_id) ?? "-",
        totalWeight: Number(r.total_weight),
        totalAmount: Number(r.total_amount),
        itemCount: ((r as { transaction_items?: unknown[] }).transaction_items ?? []).length,
      })),
      weightPerCategory: [...perCategory.entries()].map(([name, v]) => ({ name, ...v })),
      complaints: (complaints ?? []).map((c) => ({
        id: c.id,
        date: c.created_at,
        residentName: nameMap.get(c.resident_id) ?? "-",
        title: c.title,
        status: c.status,
      })),
      totals: {
        transactions: txRows.length,
        weight: txRows.reduce((s, r) => s + Number(r.total_weight), 0),
        amount: txRows.reduce((s, r) => s + Number(r.total_amount), 0),
        complaints: (complaints ?? []).length,
      },
    };
  });

// ---------- Log notifikasi ----------
export const listNotificationLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { data } = await supabase
      .from("notification_logs")
      .select("id, event_type, recipient_name, recipient_phone, message, provider, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

// ---------- Penjemputan ----------
export const listPickupsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { data } = await supabase
      .from("pickup_tasks")
      .select("id, resident_id, address, scheduled_date, status, assigned_to, notes, created_at")
      .order("scheduled_date", { ascending: false })
      .limit(200);
    const rows = data ?? [];
    const ids = [
      ...new Set(rows.flatMap((r) => [r.resident_id, r.assigned_to]).filter((x): x is string => Boolean(x))),
    ];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name, phone").in("id", ids)
      : { data: [] };
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));

    const { data: timRoles } = await supabase.from("user_roles").select("user_id").eq("role", "tim");
    const timIds = (timRoles ?? []).map((r) => r.user_id);
    const { data: timProfiles } = timIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", timIds)
      : { data: [] };

    return {
      tasks: rows.map((r) => ({
        ...r,
        resident_name: r.resident_id ? (map.get(r.resident_id)?.full_name ?? "-") : "-",
        resident_phone: r.resident_id ? (map.get(r.resident_id)?.phone ?? null) : null,
        assigned_name: r.assigned_to ? (map.get(r.assigned_to)?.full_name ?? "-") : null,
      })),
      timList: (timProfiles ?? []).map((p) => ({ id: p.id, name: p.full_name })),
    };
  });

export const assignPickup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        taskId: z.string().uuid(),
        assignedTo: z.string().uuid().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { error } = await supabase
      .from("pickup_tasks")
      .update({
        assigned_to: data.assignedTo,
        status: data.assignedTo ? "dijadwalkan" : "menunggu",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.taskId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Pengaturan jadwal layanan ----------
export const updateAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        pickupSchedule: z.string().trim().min(3, "Jadwal minimal 3 karakter").max(255),
        dropoffInfo: z.string().trim().min(3, "Info antar mandiri minimal 3 karakter").max(255),
        notify: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);

    const { error } = await supabase.from("app_settings").upsert([
      { key: "pickup_schedule", value: data.pickupSchedule, updated_by: userId },
      { key: "dropoff_info", value: data.dropoffInfo, updated_by: userId },
    ]);
    if (error) throw new Error(error.message);

    if (data.notify) {
      const { data: roleRows } = await supabase.from("user_roles").select("user_id").eq("role", "warga");
      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (ids.length > 0) {
        const { data: wargaProfiles } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .in("id", ids);
        for (const p of wargaProfiles ?? []) {
          if (!p.phone) continue;
          await sendWhatsappNotification(supabase, {
            phone: p.phone,
            name: p.full_name,
            event: "jadwal_penjemputan",
            message: buildMessage("jadwal_penjemputan", {
              jadwal: data.pickupSchedule,
              antar: data.dropoffInfo,
            }),
          });
        }
      }
    }
    return { ok: true };
  });

// ---------- Marketplace: produk ----------
export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const [{ data: products }, shippingFee, limits] = await Promise.all([
      supabase
        .from("market_products")
        .select("id, name, category, unit, price, stock, photo_url, is_active, updated_at")
        .order("category", { ascending: true })
        .order("name", { ascending: true }),
      getShippingFee(supabase),
      getMarketLimits(supabase),
    ]);
    return {
      products: await signProductPhotos(supabase, products ?? []),
      shippingFee,
      limits,
    };
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional().nullable(),
        name: z.string().trim().min(2, "Nama produk minimal 2 karakter").max(120),
        category: z.string().trim().min(2).max(40),
        unit: z.string().trim().min(1).max(20),
        price: z.number().nonnegative().max(100_000_000),
        stock: z.number().int().nonnegative().max(100_000),
        photoUrl: z.string().trim().max(500).optional().nullable(),
        isActive: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const payload = {
      name: data.name,
      category: data.category,
      unit: data.unit,
      price: data.price,
      stock: data.stock,
      photo_url: data.photoUrl ?? null,
      is_active: data.isActive,
    };
    const { error } = data.id
      ? await supabase.from("market_products").update(payload).eq("id", data.id)
      : await supabase.from("market_products").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { error } = await supabase.from("market_products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateShippingFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ fee: z.number().nonnegative().max(1_000_000) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { error } = await supabase
      .from("app_settings")
      .upsert([{ key: "market_shipping_fee", value: String(data.fee), updated_by: userId }]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Marketplace: pesanan ----------
export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { data: orders } = await supabase
      .from("market_orders")
      .select(ADMIN_ORDER_SELECT)
      .order("created_at", { ascending: false });

    const withProof = await Promise.all(
      (orders ?? []).map(async (o) => {
        let proof_signed_url: string | null = null;
        if (o.proof_url) {
          const { data } = await supabase.storage
            .from("aduan")
            .createSignedUrl(o.proof_url, 60 * 60 * 6);
          proof_signed_url = data?.signedUrl ?? null;
        }
        return {
          ...o,
          proof_signed_url,
          market_order_events: [...(o.market_order_events ?? [])].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          ),
        };
      }),
    );
    return withResidentInfo(supabase, withProof);
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(["menunggu", "dibayar", "diproses", "dikirim", "diterima", "dibatalkan"]),
        note: z.string().trim().max(300).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);

    const { data: order } = await supabase
      .from("market_orders")
      .select("id, resident_id, status, locked, paid_from_balance, market_order_items(product_id, qty)")
      .eq("id", data.orderId)
      .single();
    if (!order) throw new Error("Pesanan tidak ditemukan");
    if (order.locked) {
      throw new Error("Pesanan sudah terkunci (diterima/dibatalkan) dan tidak bisa diubah lagi.");
    }
    if (order.status === data.status) throw new Error("Status pesanan sudah sama.");

    // Stok & saldo dikunci sejak pesanan dibuat; hanya dikembalikan bila dibatalkan.
    if (data.status === "dibatalkan") {
      for (const it of order.market_order_items ?? []) {
        if (!it.product_id) continue;
        const { data: p } = await supabase
          .from("market_products")
          .select("stock")
          .eq("id", it.product_id)
          .single();
        if (!p) continue;
        await supabase
          .from("market_products")
          .update({ stock: Number(p.stock) + it.qty })
          .eq("id", it.product_id);
      }
    }

    const locking = data.status === "dibatalkan" || data.status === "diterima";
    const { error } = await supabase
      .from("market_orders")
      .update({
        status: data.status,
        admin_note: data.note ?? null,
        processed_by: userId,
        processed_at: new Date().toISOString(),
        locked: locking,
        ...(data.status === "diterima" ? { received_at: new Date().toISOString() } : {}),
      })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);

    await supabase.from("market_order_events").insert({
      order_id: data.orderId,
      status: data.status,
      note: data.note ?? null,
      created_by: userId,
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", order.resident_id)
      .single();
    if (profile?.phone) {
      await sendWhatsappNotification(supabase, {
        phone: profile.phone,
        name: profile.full_name,
        event: "status_pesanan",
        message: buildMessage("status_pesanan", {
          kode: order.id.slice(0, 8).toUpperCase(),
          status: ORDER_STATUS_TEXT[data.status] ?? data.status,
          catatan: data.note ?? "",
        }),
      });
    }
    return { ok: true };
  });

/** Rekap pesanan marketplace untuk ekspor Excel/PDF admin. */
export const getMarketReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ from: z.string().min(10), to: z.string().min(10) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);

    const { data: orders } = await supabase
      .from("market_orders")
      .select(
        "id, resident_id, method, status, shipping_fee, items_total, total_amount, paid_from_balance, cash_due, created_at, received_at, market_order_items(product_name, qty, subtotal)",
      )
      .gte("created_at", `${data.from}T00:00:00.000+07:00`)
      .lte("created_at", `${data.to}T23:59:59.999+07:00`)
      .order("created_at", { ascending: false });

    const rows = await withResidentInfo(supabase, orders ?? []);

    const active = rows.filter((o) => o.status !== "dibatalkan");
    const productMap = new Map<string, { qty: number; amount: number }>();
    for (const o of active) {
      for (const it of o.market_order_items ?? []) {
        const cur = productMap.get(it.product_name) ?? { qty: 0, amount: 0 };
        productMap.set(it.product_name, {
          qty: cur.qty + it.qty,
          amount: cur.amount + Number(it.subtotal),
        });
      }
    }

    return {
      orders: rows.map((o) => ({
        id: o.id,
        date: o.created_at,
        residentName: o.resident_name,
        method: o.method,
        status: o.status,
        items: (o.market_order_items ?? []).map((i) => `${i.product_name} x${i.qty}`).join(", "),
        itemsTotal: Number(o.items_total),
        shippingFee: Number(o.shipping_fee),
        totalAmount: Number(o.total_amount),
        paidFromBalance: Number(o.paid_from_balance),
        cashDue: Number(o.cash_due),
        receivedAt: o.received_at,
      })),
      products: [...productMap.entries()]
        .map(([name, v]) => ({ name, qty: v.qty, amount: v.amount }))
        .sort((a, b) => b.amount - a.amount),
      totals: {
        orders: rows.length,
        omzet: active.reduce((s, o) => s + Number(o.total_amount), 0),
        saldo: active.reduce((s, o) => s + Number(o.paid_from_balance), 0),
        tunai: active.reduce((s, o) => s + Number(o.cash_due), 0),
        ongkir: active.reduce((s, o) => s + Number(o.shipping_fee), 0),
      },
    };
  });

/** Batas pembelian marketplace per warga. */
export const updateMarketLimits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        maxQtyPerProduct: z.number().int().min(1).max(999),
        maxActiveOrders: z.number().int().min(1).max(99),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { error } = await supabase.from("app_settings").upsert([
      { key: "market_max_qty_per_product", value: String(data.maxQtyPerProduct), updated_by: userId },
      { key: "market_max_active_orders", value: String(data.maxActiveOrders), updated_by: userId },
    ]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

