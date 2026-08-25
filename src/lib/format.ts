export function formatRupiah(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return "Rp" + n.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

export function formatNumber(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function formatTanggal(iso: string | Date | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTanggalPanjang(iso: string | Date | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN_PANJANG[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTanggalWaktu(iso: string | Date | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const jam = d.getHours().toString().padStart(2, "0");
  const menit = d.getMinutes().toString().padStart(2, "0");
  return `${formatTanggal(d)}, ${jam}.${menit}`;
}

export function hariTanggalSekarang(now: Date): string {
  return formatTanggalPanjang(now);
}

export function jamSekarang(now: Date): string {
  const jam = now.getHours().toString().padStart(2, "0");
  const menit = now.getMinutes().toString().padStart(2, "0");
  const detik = now.getSeconds().toString().padStart(2, "0");
  return `${jam}.${menit}.${detik}`;
}

export const STATUS_LABELS: Record<string, string> = {
  menunggu: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  dicairkan: "Dicairkan",
  dijadwalkan: "Dijadwalkan",
  dalam_perjalanan: "Dalam Perjalanan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
  baru: "Baru",
  diproses: "Diproses",
  terkirim: "Terkirim",
  tercatat: "Tercatat (Mock)",
  gagal: "Gagal",
};

export const EVENT_LABELS: Record<string, string> = {
  akun_baru: "Akun Baru",
  transaksi_setoran: "Transaksi Setoran",
  status_penjemputan: "Status Penjemputan",
  pengajuan_pencairan: "Pengajuan Pencairan",
  status_pencairan: "Status Pencairan",
  status_aduan: "Status Aduan",
  pengajuan_rt: "Pengajuan RT",
};

export function statusLabel(s: string | null | undefined): string {
  return STATUS_LABELS[s ?? ""] ?? s ?? "-";
}

export type BadgeTone = "blue" | "green" | "amber" | "red" | "gray";

export function statusTone(s: string | null | undefined): BadgeTone {
  switch (s) {
    case "disetujui":
    case "selesai":
    case "dicairkan":
    case "terkirim":
      return "green";
    case "menunggu":
    case "baru":
    case "dijadwalkan":
    case "tercatat":
      return "amber";
    case "ditolak":
    case "dibatalkan":
    case "gagal":
      return "red";
    case "diproses":
    case "dalam_perjalanan":
      return "blue";
    default:
      return "gray";
  }
}
