import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Wallet, ArrowDownToLine, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { getMySavings, requestWithdrawal } from "@/lib/warga.functions";
import { formatNumber, formatRupiah, formatTanggal, formatTanggalWaktu } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/warga/tabungan")({
  head: () => ({ meta: [{ title: "Tabungan — Bank Sampah Digital" }] }),
  component: TabunganPage,
});

function TabunganPage() {
  const savingsFn = useServerFn(getMySavings);
  const withdrawalFn = useServerFn(requestWithdrawal);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["my-savings"], queryFn: () => savingsFn() });
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!data) return <Skeleton className="h-64 w-full rounded-2xl" />;

  async function submitWithdrawal() {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Masukkan nominal yang valid");
      return;
    }
    setLoading(true);
    try {
      await withdrawalFn({ data: { amount: value } });
      toast.success("Pengajuan pencairan terkirim. Notifikasi WhatsApp telah dicatat.");
      setOpen(false);
      setAmount("");
      await queryClient.invalidateQueries({ queryKey: ["my-savings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengajukan pencairan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary text-primary-foreground">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
              <Wallet className="h-3.5 w-3.5" /> Saldo Tabungan
            </p>
            <p className="mt-1 text-3xl font-bold">{formatRupiah(data.balance)}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                <ArrowDownToLine className="mr-1.5 h-4 w-4" /> Cairkan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pengajuan Pencairan Saldo</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Saldo tersedia: <span className="font-semibold text-foreground">{formatRupiah(data.balance)}</span>
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="nominal">Nominal (Rp)</Label>
                  <Input
                    id="nominal"
                    type="number"
                    min={1}
                    placeholder="contoh: 20000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={() => void submitWithdrawal()} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Ajukan Pencairan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Riwayat Setoran</h3>
        <div className="space-y-2">
          {data.transactions.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada setoran.</p>
          )}
          {data.transactions.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{formatRupiah(Number(t.total_amount))}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTanggal(t.deposit_date)} · {formatNumber(Number(t.total_weight))} kg
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Lock className="h-3 w-3" /> Harga terkunci
                  </span>
                </div>
                <div className="mt-2 space-y-1 rounded-lg bg-muted/60 p-2">
                  {(t.transaction_items as { category_name: string; weight_kg: number; price_per_kg: number; subtotal: number }[]).map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>
                        {item.category_name} · {formatNumber(Number(item.weight_kg))} kg × {formatRupiah(Number(item.price_per_kg))}
                      </span>
                      <span className="font-medium">{formatRupiah(Number(item.subtotal))}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Riwayat Pencairan</h3>
        <div className="space-y-2">
          {data.withdrawals.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada pengajuan pencairan.</p>
          )}
          {data.withdrawals.map((w) => (
            <Card key={w.id}>
              <CardContent className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-sm font-semibold">{formatRupiah(Number(w.amount))}</p>
                  <p className="text-xs text-muted-foreground">{formatTanggalWaktu(w.created_at)}</p>
                  {w.note && <p className="mt-1 text-xs text-muted-foreground">Catatan: {w.note}</p>}
                </div>
                <StatusBadge status={w.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
