import type { SupabaseClient } from "@supabase/supabase-js";

export { getBalance } from "./data.server";

/** Tarif ongkir flat (rupiah) yang diatur Admin di app_settings. */
export async function getShippingFee(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "market_shipping_fee")
    .maybeSingle();
  const raw = data?.value;
  const n = Number(typeof raw === "string" ? raw : String(raw ?? 0));
  return Number.isFinite(n) ? n : 0;
}

type ProductRow = { photo_url?: string | null } & Record<string, unknown>;

/** Bucket produk bersifat privat — buat signed URL untuk ditampilkan. */
export async function signProductPhotos<T extends ProductRow>(
  supabase: SupabaseClient,
  rows: T[],
): Promise<(T & { photo_signed_url: string | null })[]> {
  return Promise.all(
    rows.map(async (r) => {
      if (!r.photo_url) return { ...r, photo_signed_url: null };
      const { data } = await supabase.storage
        .from("produk")
        .createSignedUrl(r.photo_url, 60 * 60 * 24);
      return { ...r, photo_signed_url: data?.signedUrl ?? null };
    }),
  );
}
