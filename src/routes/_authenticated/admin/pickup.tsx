import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Truck, UserCheck } from "lucide-react";
import { assignPickup, listPickupsAdmin } from "@/lib/admin.functions";
import { formatTanggal, statusLabel } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/pickup")({
  head: () => ({ meta: [{ title: "Tugas Penjemputan — LESTARI MAGETAN" }] }),
  component: PickupPage,
});

function PickupPage() {
  const listFn = useServerFn(listPickupsAdmin);
  const assignFn = useServerFn(assignPickup);
  const queryClient = useQueryClient();

  const { data } = useQuery({ queryKey: ["admin-pickups"], queryFn: () => listFn() });
  const [target, setTarget] = useState<string | null>(null);
  const [selectedTim, setSelectedTim] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const tasks = data?.tasks ?? [];
  const timList = data?.timList ?? [];

  async function submitAssign() {
    if (!target) return;
    setLoading(true);
    try {
      await assignFn({ data: { taskId: target, assignedTo: selectedTim || null } });
      toast.success(selectedTim ? "Tugas dijadwalkan ke petugas." : "Penugasan dibatalkan, status kembali Menunggu.");
      setTarget(null);
      setSelectedTim("");
      await queryClient.invalidateQueries({ queryKey: ["admin-pickups"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menugaskan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Tugas Penjemputan</h1>
        <p className="text-sm text-muted-foreground">
          Tugaskan permintaan jemput warga ke petugas tim. Perubahan status oleh tim mengirim notifikasi WhatsApp ke warga.
        </p>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Belum ada tugas penjemputan.</CardContent></Card>
        )}
        {tasks.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{t.resident_name}</p>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-sm text-muted-foreground">{t.address}</p>
                <p className="text-xs text-muted-foreground">
                  Jadwal: {formatTanggal(t.scheduled_date)}
                  {t.resident_phone ? ` · WA: ${t.resident_phone}` : ""}
                  {t.assigned_name ? ` · Petugas: ${t.assigned_name}` : " · Belum ada petugas"}
                </p>
                {t.notes && <p className="text-xs text-muted-foreground">Catatan: {t.notes}</p>}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => { setTarget(t.id); setSelectedTim(t.assigned_to ?? ""); }}
              >
                <UserCheck className="h-4 w-4" /> Tugaskan
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Tugaskan Petugas</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Petugas tim</Label>
            <Select value={selectedTim} onValueChange={setSelectedTim}>
              <SelectTrigger><SelectValue placeholder="Pilih petugas…" /></SelectTrigger>
              <SelectContent>
                {timList.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Menugaskan mengubah status menjadi "{statusLabel("dijadwalkan")}". Kosongkan pilihan untuk membatalkan penugasan.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Batal</Button>
            <Button disabled={loading} onClick={() => void submitAssign()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
