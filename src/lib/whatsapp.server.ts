import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationEvent =
  | "akun_baru"
  | "transaksi_setoran"
  | "status_penjemputan"
  | "pengajuan_pencairan"
  | "status_pencairan"
  | "status_aduan"
  | "jadwal_penjemputan";

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
export async function sendWhatsappNotification(
  supabase: SupabaseClient,
  input: {
    phone: string;
    name?: string | null | undefined;
    event: NotificationEvent;
    message: string;
  },
): Promise<void> {
  const apiUrl = process.env["WHATSAPP_API_URL"];
  const apiToken = process.env["WHATSAPP_API_TOKEN"];

  let provider = "mock";
  let status: "terkirim" | "tercatat" | "gagal" = "tercatat";

  if (apiUrl && apiToken) {
    provider = "whatsapp-api";
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ to: input.phone, message: input.message }),
      });
      status = res.ok ? "terkirim" : "gagal";
    } catch (err) {
      console.error("Gagal mengirim WhatsApp:", err);
      status = "gagal";
    }
  }

  const { error } = await supabase.from("notification_logs").insert({
    event_type: input.event,
    recipient_name: input.name ?? null,
    recipient_phone: input.phone,
    message: input.message,
    provider,
    status,
  });
  if (error) console.error("Gagal mencatat log notifikasi:", error.message);
}
