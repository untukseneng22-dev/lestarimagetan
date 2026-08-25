import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Banknote, Check, Loader2, Wallet, X } from "lucide-react";
import { listWithdrawals, processWithdrawal } from "@/lib/admin.functions";
import { formatRupiah, formatTanggalWaktu } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/kas")({
  head: () => ({ meta: [{ title: "Kas & Pencairan — LESTARI MAGETAN" }] }),
  component: KasPage,
});

function KasPage() {
  const listFn = useServerFn(listWithdrawals);
  const processFn = useServerFn(processWithdrawal);
  const queryClient = useQueryClient();

  const { data: rows } = useQuery({ queryKey: ["admin-withdrawals"], queryFn: () => listFn() });
  const [tab, setTab] = useState("menunggu");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = (rows ?? []).filter((r) => tab === "semua" || r.status === tab);
  const totalPending = (rows ?? []).filter((r) => r.status === "menunggu").reduce((s, r) => s + Number(r.amount), 0);

  async function process(id: string, status: "disetujui" | "ditolak" | "dicairkan", noteText?: string) {
    setBusyId(id);
    try {
      await processFn({ data: { withdrawalId: id, status, note: noteText } });
      const msg = status === "disetujui" ? "Pengajuan disetujui." : status === "dicairkan" ? "Ditandai sudah dicairkan." : "Pengajuan ditolak.";
      toast.success(msg + " Warga menerima notifikasi WhatsApp.");
      setRejectTarget(null);
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kas & Pencairan</h1>
          <p className="text-sm text-muted-foreground">Proses pengajuan pencairan saldo tabungan warga.</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-2 text-sm">
          <span className="text-muted-foreground">Menunggu diproses: </span>
          <b className="text-accent">{formatRupiah(totalPending)}</b>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="menunggu">Menunggu</TabsTrigger>
          <TabsTrigger value="disetujui">Disetujui</TabsTrigger>
          <TabsTrigger value="dicairkan">Dicairkan</TabsTrigger>
          <TabsTrigger value="ditolak">Ditolak</TabsTrigger>
          <TabsTrigger value="semua">Semua</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Tidak ada pengajuan pada status ini.</CardContent></Card>
        )}
        {filtered.map((w) => (
          <Card key={w.id}>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <p className="font-semibold">{w.resident_name}</p>
                  <StatusBadge status={w.status} />
                </div>
                <p className="text-lg font-bold text-accent">{formatRupiah(Number(w.amount))}</p>
                <p className="text-xs text-muted-foreground">
                  Saldo warga saat ini: {formatRupiah(w.resident_balance)}
                  {w.resident_phone ? ` · WA: ${w.resident_phone}` : ""} · Diajukan {formatTanggalWaktu(w.created_at)}
                </p>
                {w.processed_at && (
                  <p className="text-xs text-muted-foreground">Diproses: {formatTanggalWaktu(w.processed_at)}</p>
                )}
                {w.note && <p className="rounded-lg bg-muted px-3 py-1.5 text-xs">Catatan: {w.note}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {w.status === "menunggu" && (
                  <>
                    <Button size="sm" disabled={busyId === w.id} onClick={() => void process(w.id, "disetujui")}>
                      {busyId === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Setujui
                    </Button>
                    <Button size="sm" variant="destructive" disabled={busyId === w.id} onClick={() => { setRejectTarget(w.id); setNote(""); }}>
                      <X className="h-4 w-4" /> Tolak
                    </Button>
                  </>
                )}
                {w.status === "disetujui" && (
                  <Button size="sm" variant="outline" disabled={busyId === w.id} onClick={() => void process(w.id, "dicairkan")}>
                    {busyId === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                    Tandai Dicairkan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={rejectTarget !== null} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pencairan</DialogTitle>
            <DialogDescription>Berikan catatan alasan penolakan untuk warga.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="catatan-tolak">Catatan</Label>
            <Input id="catatan-tolak" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: saldo tidak mencukupi" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={busyId !== null}
              onClick={() => rejectTarget && void process(rejectTarget, "ditolak", note.trim() || undefined)}
            >
              Tolak Pengajuan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
