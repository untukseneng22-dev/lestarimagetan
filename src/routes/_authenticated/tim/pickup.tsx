import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { listPickupTasks, updatePickupStatus } from "@/lib/tim.functions";
import { formatTanggalPanjang } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/tim/pickup")({
  head: () => ({ meta: [{ title: "Tugas Penjemputan — Bank Sampah Digital" }] }),
  component: PickupPage,
});

const NEXT_ACTIONS: Record<string, { label: string; status: "dijadwalkan" | "dalam_perjalanan" | "selesai" }[]> = {
  menunggu: [{ label: "Jadwalkan", status: "dijadwalkan" }],
  dijadwalkan: [{ label: "Mulai Jemput", status: "dalam_perjalanan" }],
  dalam_perjalanan: [{ label: "Selesaikan", status: "selesai" }],
};

function PickupPage() {
  const tasksFn = useServerFn(listPickupTasks);
  const updateFn = useServerFn(updatePickupStatus);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["pickup-tasks"], queryFn: () => tasksFn() });
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!data) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const active = data.filter((t) => t.status !== "selesai" && t.status !== "dibatalkan");
  const done = data.filter((t) => t.status === "selesai" || t.status === "dibatalkan");

  async function setStatus(taskId: string, status: "dijadwalkan" | "dalam_perjalanan" | "selesai") {
    setBusyId(taskId);
    try {
      await updateFn({ data: { taskId, status } });
      toast.success("Status diperbarui. Warga menerima notifikasi WhatsApp.");
      await queryClient.invalidateQueries({ queryKey: ["pickup-tasks"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui status");
    } finally {
      setBusyId(null);
    }
  }

  function TaskCard({ task }: { task: (typeof data)[number] }) {
    return (
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{task.resident_name}</p>
              <p className="text-xs text-muted-foreground">{formatTanggalPanjang(task.scheduled_date)}</p>
            </div>
            <StatusBadge status={task.status} />
          </div>
          <p className="text-xs text-muted-foreground">{task.address}</p>
          {task.notes && <p className="text-xs italic text-muted-foreground">"{task.notes}"</p>}
          {task.resident_phone && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" /> {task.resident_phone}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            {(NEXT_ACTIONS[task.status] ?? []).map((a) => (
              <Button
                key={a.status}
                size="sm"
                disabled={busyId === task.id}
                onClick={() => void setStatus(task.id, a.status)}
              >
                {busyId === task.id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {a.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Tugas Penjemputan</h2>
        <p className="text-xs text-muted-foreground">{active.length} tugas aktif</p>
      </div>
      <div className="space-y-2">
        {active.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada tugas aktif.</p>}
        {active.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
      </div>
      {done.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Riwayat Selesai</h3>
          <div className="space-y-2">
            {done.slice(0, 10).map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
