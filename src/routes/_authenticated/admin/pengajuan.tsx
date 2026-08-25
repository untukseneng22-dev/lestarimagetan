import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Check, KeyRound, Loader2, X } from "lucide-react";
import {
  createAccountFromRequest,
  decideRegistration,
  listRegistrationRequests,
} from "@/lib/admin.functions";
import { formatTanggalWaktu } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/pengajuan")({
  head: () => ({ meta: [{ title: "Pengajuan Pendaftaran — Bank Sampah Digital" }] }),
  component: PengajuanPage,
});

function PengajuanPage() {
  const listFn = useServerFn(listRegistrationRequests);
  const decideFn = useServerFn(decideRegistration);
  const createAccFn = useServerFn(createAccountFromRequest);
  const queryClient = useQueryClient();

  const { data: rows } = useQuery({ queryKey: ["admin-requests"], queryFn: () => listFn() });
  const [tab, setTab] = useState("menunggu");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = (rows ?? []).filter((r) => tab === "semua" || r.status === tab);

  async function decide(requestId: string, decision: "disetujui" | "ditolak", note?: string) {
    setBusyId(requestId);
    try {
      await decideFn({ data: { requestId, decision, reason: note } });
      toast.success(decision === "disetujui" ? "Pengajuan disetujui. RT menerima notifikasi WhatsApp." : "Pengajuan ditolak dengan alasan tercatat.");
      setRejectTarget(null);
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses");
    } finally {
      setBusyId(null);
    }
  }

  async function createAccount(requestId: string) {
    setBusyId(requestId);
    try {
      const res = await createAccFn({ data: { requestId } });
      toast.success(`Akun dibuat. Login: ${res.email} / sandi: ${res.password} (dikirim via WhatsApp)`);
      await queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat akun");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Pengajuan Pendaftaran RT</h1>
        <p className="text-sm text-muted-foreground">
          Antrian calon warga yang diajukan RT. Hanya pengajuan Disetujui yang dapat dibuatkan akun.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="menunggu">Menunggu</TabsTrigger>
          <TabsTrigger value="disetujui">Disetujui</TabsTrigger>
          <TabsTrigger value="ditolak">Ditolak</TabsTrigger>
          <TabsTrigger value="semua">Semua</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Tidak ada pengajuan pada status ini.</CardContent></Card>
        )}
        {filtered.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{r.full_name}</p>
                  <StatusBadge status={r.status} />
                  {r.account_created && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">Akun dibuat</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{r.address}{r.rt ? ` — RT ${r.rt}` : ""}</p>
                <p className="text-sm text-muted-foreground">WA: {r.whatsapp_number} · Diajukan oleh {r.rt_name} · {formatTanggalWaktu(r.created_at)}</p>
                {r.decided_at && (
                  <p className="text-xs text-muted-foreground">Diputuskan: {formatTanggalWaktu(r.decided_at)}</p>
                )}
                {r.status === "ditolak" && r.reason && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">Alasan: {r.reason}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {r.status === "menunggu" && (
                  <>
                    <Button size="sm" disabled={busyId === r.id} onClick={() => void decide(r.id, "disetujui")}>
                      {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Setujui
                    </Button>
                    <Button size="sm" variant="destructive" disabled={busyId === r.id} onClick={() => { setRejectTarget(r.id); setReason(""); }}>
                      <X className="h-4 w-4" /> Tolak
                    </Button>
                  </>
                )}
                {r.status === "disetujui" && !r.account_created && (
                  <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => void createAccount(r.id)}>
                    {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    Buat Akun & QR
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
            <DialogTitle>Tolak Pengajuan</DialogTitle>
            <DialogDescription>Alasan penolakan wajib diisi dan akan ditampilkan ke RT pengaju.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="alasan">Alasan penolakan</Label>
            <Textarea
              id="alasan"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: alamat di luar wilayah layanan RT 04"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 3 || busyId !== null}
              onClick={() => rejectTarget && void decide(rejectTarget, "ditolak", reason.trim())}
            >
              Tolak Pengajuan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
