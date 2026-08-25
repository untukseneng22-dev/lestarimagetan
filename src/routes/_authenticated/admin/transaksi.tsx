import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import { listTransactionsAdmin } from "@/lib/admin.functions";
import { formatNumber, formatRupiah, formatTanggal, todayISO } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/transaksi")({
  head: () => ({ meta: [{ title: "Transaksi Setoran — Bank Sampah Digital" }] }),
  component: TransaksiPage,
});

function monthStartISO(): string {
  return todayISO().slice(0, 8) + "01";
}

function TransaksiPage() {
  const listFn = useServerFn(listTransactionsAdmin);
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-transactions", from, to],
    queryFn: () => listFn({ data: { from, to } }),
  });

  const totalWeight = (rows ?? []).reduce((s, r) => s + Number(r.total_weight), 0);
  const totalAmount = (rows ?? []).reduce((s, r) => s + Number(r.total_amount), 0);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Transaksi Setoran</h1>
        <p className="text-sm text-muted-foreground">
          Setiap baris menyimpan snapshot harga yang terkunci pada tanggal setoran.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dari">Dari tanggal</Label>
          <Input id="dari" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sampai">Sampai tanggal</Label>
          <Input id="sampai" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {rows?.length ?? 0} transaksi · {formatNumber(totalWeight)} kg · <b className="text-foreground">{formatRupiah(totalAmount)}</b>
        </div>
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Memuat…</p>}
          {!isLoading && (rows ?? []).length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada transaksi pada rentang ini.</p>
          )}
          {(rows ?? []).map((t) => {
            const open = expanded.has(t.id);
            const items = (t.transaction_items ?? []) as {
              category_name: string; weight_kg: number; price_per_kg: number; subtotal: number;
            }[];
            return (
              <div key={t.id}>
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.resident_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTanggal(t.deposit_date)} · dicatat oleh {t.recorded_by_name} · {items.length} jenis
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-accent">{formatRupiah(Number(t.total_amount))}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(Number(t.total_weight))} kg</p>
                  </div>
                </button>
                {open && (
                  <div className="space-y-1.5 bg-muted/40 px-4 py-3">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Lock className="h-3 w-3" /> Harga terkunci saat setoran
                    </p>
                    {items.map((it, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm">
                        <span>
                          {it.category_name} · {formatNumber(Number(it.weight_kg))} kg × {formatRupiah(Number(it.price_per_kg))}
                        </span>
                        <span className="font-medium">{formatRupiah(Number(it.subtotal))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
