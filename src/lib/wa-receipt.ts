import { formatNumber, formatRupiah, formatTanggal } from "./format";

export type ReceiptItem = { category_name: string; weight_kg: number; price_per_kg: number; subtotal: number };

/** Normalisasi nomor ke format internasional 62xxxx untuk wa.me */
export function normalizeWaPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  else if (p.startsWith("8")) p = "62" + p;
  return p.length >= 10 ? p : null;
}

export function buildReceiptText(opts: {
  name: string;
  date: string;
  items: ReceiptItem[];
  totalWeight: number;
  totalAmount: number;
  newBalance?: number | null;
}): string {
  const lines = [
    "*STRUK SETORAN SAMPAH*",
    "LESTARI MAGETAN",
    "------------------------------",
    `Nama    : ${opts.name}`,
    `Tanggal : ${formatTanggal(opts.date)}`,
    "------------------------------",
    ...opts.items.map(
      (it) =>
        `• ${it.category_name}\n   ${formatNumber(Number(it.weight_kg))} kg × ${formatRupiah(Number(it.price_per_kg))} = ${formatRupiah(Number(it.subtotal))}`,
    ),
    "------------------------------",
    `Total berat : ${formatNumber(opts.totalWeight)} kg`,
    `*Total nilai : ${formatRupiah(opts.totalAmount)}*`,
  ];
  if (opts.newBalance != null) lines.push(`Saldo sekarang : ${formatRupiah(opts.newBalance)}`);
  lines.push("", "Terima kasih telah menjaga lingkungan 🌱");
  return lines.join("\n");
}

export function waLink(phone: string | null | undefined, text: string): string {
  const p = normalizeWaPhone(phone);
  const t = encodeURIComponent(text);
  return p ? `https://wa.me/${p}?text=${t}` : `https://wa.me/?text=${t}`;
}
