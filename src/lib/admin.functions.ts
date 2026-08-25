import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getPricesAtDate, requireRole } from "./data.server";
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
      { count: pendingRequests },
      { count: pendingWithdrawals },
      { count: openComplaints },
      { count: activePickups },
    ] = await Promise.all([
      supabase.from("user_roles").select("role"),
      supabase.from("transactions").select("total_amount, total_weight").gte("deposit_date", monthISO),
      supabase.from("transactions").select("total_amount"),
      supabase.from("registration_requests").select("id", { count: "exact", head: true }).eq("status", "menunggu"),
      supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "menunggu"),
      supabase.from("complaints").select("id", { count: "exact", head: true }).in("status", ["baru", "diproses"]),
      supabase.from("pickup_tasks").select("id", { count: "exact", head: true }).in("status", ["menunggu", "dijadwalkan", "dalam_perjalanan"]),
    ]);

    const countRole = (r: string) => (roles ?? []).filter((x) => x.role === r).length;
    return {
      totalWarga: countRole("warga"),
      totalTim: countRole("tim"),
      totalRt: countRole("rt"),
      setoranBulanIni: (txMonth ?? []).length,
      beratBulanIni: (txMonth ?? []).reduce((s, t) => s + Number(t.total_weight), 0),
      nilaiBulanIni: (txMonth ?? []).reduce((s, t) => s + Number(t.total_amount), 0),
      totalSaldoWarga: (txAll ?? []).reduce((s, t) => s + Number(t.total_amount), 0),
      pendingRequests: pendingRequests ?? 0,
      pendingWithdrawals: pendingWithdrawals ?? 0,
      openComplaints: openComplaints ?? 0,
      activePickups: activePickups ?? 0,
    };
  });

// ---------- Manajemen pengguna ----------
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ role: z.enum(["warga", "tim", "rt", "admin"]) }).parse(data))
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
    return profiles ?? [];
  });

export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        role: z.enum(["warga", "tim", "rt"]),
        fullName: z.string().trim().min(3).max(100),
        phone: z.string().trim().regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid"),
        address: z.string().trim().min(3).max(255),
        rt: z.string().trim().max(20).optional(),
        email: z.string().trim().email().max(255),
        password: z.string().min(6, "Kata sandi minimal 6 karakter").max(72),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
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
          email: data.email,
          password: data.password,
        }),
      });
    }
    return { ok: true, userId: created.user.id };
  });

// ---------- Antrian persetujuan pendaftaran ----------
export const listRegistrationRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    const { data } = await supabase
      .from("registration_requests")
      .select("id, rt_user_id, full_name, address, whatsapp_number, rt, status, reason, decided_at, account_created, created_at")
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    const rtIds = [...new Set(rows.map((r) => r.rt_user_id))];
    const { data: rtProfiles } = rtIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", rtIds)
      : { data: [] };
    const rtMap = new Map((rtProfiles ?? []).map((p) => [p.id, p.full_name]));
    return rows.map((r) => ({ ...r, rt_name: rtMap.get(r.rt_user_id) ?? "-" }));
  });

export const decideRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        requestId: z.string().uuid(),
        decision: z.enum(["disetujui", "ditolak"]),
        reason: z.string().trim().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);
    if (data.decision === "ditolak" && !data.reason) {
      throw new Error("Alasan penolakan wajib diisi");
    }
    const { data: req } = await supabase
      .from("registration_requests")
      .select("rt_user_id, full_name, address")
      .eq("id", data.requestId)
      .single();

    const { error } = await supabase
      .from("registration_requests")
      .update({
        status: data.decision,
        reason: data.reason ?? null,
        decided_by: userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.requestId)
      .eq("status", "menunggu");
    if (error) throw new Error(error.message);

    if (req?.rt_user_id) {
      const { data: rtProfile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", req.rt_user_id)
        .single();
      await sendWhatsappNotification(supabase, {
        phone: rtProfile?.phone ?? "-",
        name: rtProfile?.full_name ?? null,
        event: "pengajuan_rt",
        message: buildMessage("pengajuan_rt", {
          nama: req.full_name,
          alamat: req.address,
          status: data.decision === "disetujui" ? "Disetujui" : "Ditolak",
          alasan: data.reason ?? "",
        }),
      });
    }
    return { ok: true };
  });

export const createAccountFromRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ requestId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, ["admin"]);

    const { data: req } = await supabase
      .from("registration_requests")
      .select("*")
      .eq("id", data.requestId)
      .single();
    if (!req) throw new Error("Pengajuan tidak ditemukan");
    if (req.status !== "disetujui") throw new Error("Hanya pengajuan berstatus Disetujui yang bisa dibuatkan akun");
    if (req.account_created) throw new Error("Akun untuk pengajuan ini sudah dibuat");

    const digits = req.whatsapp_number.replace(/\D/g, "").replace(/^0/, "62");
    const email = `wa${digits}@banksampah.id`;
    const password = "password123";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: req.full_name },
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      full_name: req.full_name,
      phone: req.whatsapp_number,
      address: req.address,
      rt: req.rt,
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "warga" });
    await supabaseAdmin
      .from("registration_requests")
      .update({ account_created: true })
      .eq("id", data.requestId);

    await sendWhatsappNotification(supabase, {
      phone: req.whatsapp_number,
      name: req.full_name,
      event: "akun_baru",
      message: buildMessage("akun_baru", { nama: req.full_name, email, password }),
    });
    return { ok: true, email, password };
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
      recorded_by_name: nameMap.get(r.recorded_by) ?? "-",
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
