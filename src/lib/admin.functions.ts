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
    return profiles ?? [];
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
