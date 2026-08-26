import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PackageSearch, Store, Truck } from "lucide-react";
import { adminListOrders, updateOrderStatus } from "@/lib/admin.functions";
import { formatRupiah, formatTanggalWaktu } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderTimeline } from "@/components/OrderTimeline";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/pesanan")({
  head: () => ({
    meta: [
      { title: "Pesanan Marketplace — LESTARI MAGETAN" },
      { name: "description", content: "Kelola dan proses pesanan sembako warga dari saldo tabungan sampah." },
    ],
  }),
  component: PesananPage,
});

const NEXT_STATUS = [
  { value: "dibayar", label: "Tandai Dibayar" },
  { value: "diproses", label: "Proses" },
  { value: "dikirim", label: "Kirim" },
  { value: "diterima", label: "Diterima" },
  { value: "dibatalkan", label: "Batalkan" },
] as const;

const FILTERS = ["semua", "menunggu", "dibayar", "diproses", "dikirim", "diterima", "dibatalkan"];

function PesananPage() {
  const listFn = useServerFn(adminListOrders);
  const statusFn = useServerFn(updateOrderStatus);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-orders"], queryFn: () => listFn() });

  const [filter, setFilter] = useState("semua");
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function setStatus(orderId: string, status: (typeof NEXT_STATUS)[number]["value"]) {
    try {
      await statusFn({ data: { orderId, status, note: notes[orderId] ?? null } });
      toast.success("Status pesanan diperbarui dan notifikasi WhatsApp dicatat.");
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui status");
    }
  }

  if (!data) return <Skeleton className="h-96 w-full rounded-2xl" />;

  const rows = data.filter((o) => filter === "semua" || o.status === filter);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Pesanan Marketplace</h1>
        <p className="text-xs text-muted-foreground">
          Saldo & stok warga dikunci sejak pesanan dibuat; dikembalikan hanya bila pesanan dibatalkan.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
              f === filter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          <PackageSearch className="mx-auto mb-2 h-8 w-8 opacity-50" />
          Belum ada pesanan pada filter ini.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((o) => (
            <Card key={o.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">
                      #{o.id.slice(0, 8).toUpperCase()} · {o.resident_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTanggalWaktu(o.created_at)}
                      {o.resident_phone ? ` · ${o.resident_phone}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>

                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  {o.method === "antar" ? (
                    <>
                      <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Diantar ke: {o.address}
                    </>
                  ) : (
                    <>
                      <Store className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Diambil di kantor bank sampah
                    </>
                  )}
                </p>

                <div className="space-y-0.5 rounded-lg bg-muted/60 p-2.5 text-xs">
                  {(o.market_order_items ?? []).map((it, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {it.product_name} x{it.qty}
                      </span>
                      <span>{formatRupiah(Number(it.subtotal))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-border pt-1">
                    <span className="text-muted-foreground">Ongkir</span>
                    <span>{formatRupiah(Number(o.shipping_fee))}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatRupiah(Number(o.total_amount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Potong saldo</span>
                    <span>{formatRupiah(Number(o.paid_from_balance))}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-muted-foreground">Tagihan tunai</span>
                    <span>{formatRupiah(Number(o.cash_due))}</span>
                  </div>
                </div>

                {o.admin_note && (
                  <p className="text-xs text-muted-foreground">Catatan: {o.admin_note}</p>
                )}

                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="mb-1.5 text-xs font-semibold">Pelacakan</p>
                  <OrderTimeline events={o.market_order_events ?? []} status={o.status} />
                </div>

                {o.proof_signed_url && (
                  <a
                    href={o.proof_signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border border-border"
                  >
                    <img src={o.proof_signed_url} alt="Bukti terima warga" className="h-32 w-full object-cover" />
                  </a>
                )}

                {o.locked && (
                  <p className="text-xs font-medium text-muted-foreground">
                    Pesanan terkunci — stok & saldo sudah final.
                  </p>
                )}

                <Input
                  disabled={o.locked}
                  value={notes[o.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [o.id]: e.target.value })}
                  placeholder="Catatan untuk warga (opsional)"
                  maxLength={300}
                />
                <div className="flex flex-wrap gap-1.5">
                  {NEXT_STATUS.map((s) => (
                    <Button
                      key={s.value}
                      size="sm"
                      variant={s.value === "dibatalkan" ? "outline" : "secondary"}
                      disabled={o.status === s.value || o.locked}
                      onClick={() => setStatus(o.id, s.value)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
