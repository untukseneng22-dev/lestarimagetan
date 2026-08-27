import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationEvent =
  | "akun_baru"
  | "transaksi_setoran"
  | "status_penjemputan"
  | "pengajuan_pencairan"
  | "status_pencairan"
  | "status_aduan"
  | "jadwal_penjemputan"
  | "reset_sandi"
  | "pesanan_marketplace"
  | "status_pesanan";

export function rupiah(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export function buildMessage(
  event: NotificationEvent,
  payload: Record<string, string>,
): string {
  switch (event) {
    case "akun_baru":
      return `Halo ${payload["nama"]}! Akun Bank Sampah Anda telah dibuat.\nUsername: ${payload["username"]}\nKata sandi: ${payload["password"]}\nTunjukkan QR di aplikasi saat menyetor sampah. Selamat bergabung!`;
    case "transaksi_setoran":
      return `Setoran ${payload["tanggal"]} berhasil dicatat.\nRincian: ${payload["rincian"]}\nTotal: ${payload["total"]}\nSaldo Anda kini: ${payload["saldo"]}. Terima kasih sudah memilah sampah!`;
    case "status_penjemputan":
      return `Status penjemputan Anda (${payload["tanggal"]}) berubah menjadi: ${payload["status"]}.${payload["petugas"] ? ` Petugas: ${payload["petugas"]}.` : ""}`;
    case "pengajuan_pencairan":
      return `Pengajuan pencairan saldo sebesar ${payload["jumlah"]} telah kami terima dan sedang diproses oleh admin Bank Sampah.`;
    case "status_pencairan":
      return `Pengajuan pencairan saldo ${payload["jumlah"]} kini berstatus: ${payload["status"]}.${payload["catatan"] ? ` Catatan: ${payload["catatan"]}` : ""}`;
    case "status_aduan":
      return `Aduan "${payload["judul"]}" kini berstatus: ${payload["status"]}.${payload["tanggapan"] ? ` Tanggapan: ${payload["tanggapan"]}` : ""}`;
    case "jadwal_penjemputan":
      return `Info jadwal Bank Sampah:\nPenjemputan rutin: ${payload["jadwal"]}.\nAntar mandiri: ${payload["antar"]}.`;
    case "reset_sandi":
      return `Halo ${payload["nama"]}! Kata sandi akun Bank Sampah Anda telah direset oleh admin.\nUsername: ${payload["username"]}\nKata sandi baru: ${payload["password"]}\nSimpan baik-baik kredensial ini.`;
    case "pesanan_marketplace":
      return `Pesanan sembako Anda telah kami terima.\nRincian: ${payload["rincian"]}\nTotal: ${payload["total"]} (saldo ${payload["saldo"]}, tunai ${payload["tunai"]})\nPengambilan: ${payload["metode"]}. Menunggu konfirmasi admin.`;
    case "status_pesanan":
      return `Pesanan sembako Anda (${payload["kode"]}) kini berstatus: ${payload["status"]}.${payload["catatan"] ? ` Catatan: ${payload["catatan"]}` : ""}`;
    default:
      return "Notifikasi LESTARI MAGETAN.";
  }
}

/**
 * Mengirim notifikasi WhatsApp dan selalu mencatatnya ke notification_logs.
 *
 * Titik integrasi provider: set secret WHATSAPP_API_URL dan WHATSAPP_API_TOKEN.
 * Jika belum diset, pesan dicatat sebagai mock (status "tercatat") sehingga
 * seluruh alur tetap bisa didemokan tanpa kredensial.
 */
export type SendResult = {
  status: "terkirim" | "tercatat" | "gagal";
  provider: string;
  error: string | null;
};

/** Mengirim pesan ke provider (tanpa mencatat log). */
export async function deliverWhatsapp(input: {
  phone: string;
  message: string;
}): Promise<SendResult> {
  const apiUrl = process.env["WHATSAPP_API_URL"];
  const apiToken = process.env["WHATSAPP_API_TOKEN"];
  if (!apiUrl || !apiToken) {
    return { status: "tercatat", provider: "mock", error: null };
  }
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ to: input.phone, message: input.message }),
    });
    if (res.ok) return { status: "terkirim", provider: "whatsapp-api", error: null };
    const body = (await res.text().catch(() => "")).slice(0, 300);
    return {
      status: "gagal",
      provider: "whatsapp-api",
      error: `HTTP ${res.status} ${res.statusText}${body ? ` — ${body}` : ""}`,
    };
  } catch (err) {
    return {
      status: "gagal",
      provider: "whatsapp-api",
      error: err instanceof Error ? err.message : "Kesalahan jaringan tidak diketahui",
    };
  }
}

export async function sendWhatsappNotification(
  supabase: SupabaseClient,
  input: {
    phone: string;
    name?: string | null | undefined;
    event: NotificationEvent;
    message: string;
  },
): Promise<void> {
  const result = await deliverWhatsapp({ phone: input.phone, message: input.message });
  if (result.error) console.error("Gagal mengirim WhatsApp:", result.error);

  const now = new Date().toISOString();
  const { error } = await supabase.from("notification_logs").insert({
    event_type: input.event,
    recipient_name: input.name ?? null,
    recipient_phone: input.phone,
    message: input.message,
    provider: result.provider,
    status: result.status,
    error_message: result.error,
    attempt_count: 1,
    last_attempt_at: now,
  });
  if (error) console.error("Gagal mencatat log notifikasi:", error.message);
}

