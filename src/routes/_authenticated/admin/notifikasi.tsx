import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listNotificationLogs, retryNotification } from "@/lib/admin.functions";
import { EVENT_LABELS, formatTanggalWaktu } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/notifikasi")({
  head: () => ({ meta: [{ title: "Log Notifikasi WhatsApp — LESTARI MAGETAN" }] }),
  component: NotifikasiPage,
});

function NotifikasiPage() {
  const logsFn = useServerFn(listNotificationLogs);
  const retryFn = useServerFn(retryNotification);
  const queryClient = useQueryClient();
  const { data: rows, isLoading } = useQuery({ queryKey: ["admin-notif-logs"], queryFn: () => logsFn() });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [retrying, setRetrying] = useState<string | null>(null);
  const [onlyFailed, setOnlyFailed] = useState(false);

  async function retry(id: string) {
    setRetrying(id);
    try {
      const res = await retryFn({ data: { id } });
      if (res.status === "gagal") toast.error(`Kirim ulang gagal: ${res.error ?? "tidak diketahui"}`);
      else toast.success("Notifikasi berhasil dikirim ulang.");
      await queryClient.invalidateQueries({ queryKey: ["admin-notif-logs"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim ulang");
    } finally {
      setRetrying(null);
    }
  }

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
        <h1 className="text-2xl font-bold">Log Notifikasi WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Setiap peristiwa sistem tercatat di sini. Status "Tercatat (Mock)" berarti kredensial provider WhatsApp belum diatur — pesan siap dikirim begitu integrasi diaktifkan.
        </p>
        <Button
          variant={onlyFailed ? "default" : "outline"}
          size="sm"
          className="mt-3"
          onClick={() => setOnlyFailed((v) => !v)}
        >
          {onlyFailed ? "Tampilkan semua log" : "Tampilkan yang gagal saja"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Waktu</TableHead>
                <TableHead>Peristiwa</TableHead>
                <TableHead>Penerima</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Percobaan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Memuat…</TableCell></TableRow>
              )}
              {!isLoading && (rows ?? []).length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada notifikasi.</TableCell></TableRow>
              )}
              {(onlyFailed ? (rows ?? []).filter((l) => l.status === "gagal") : (rows ?? [])).map((l) => (
                <Fragment key={l.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => toggle(l.id)}
                  >
                    <TableCell>
                      {expanded.has(l.id)
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{formatTanggalWaktu(l.created_at)}</TableCell>
                    <TableCell className="font-medium">{EVENT_LABELS[l.event_type] ?? l.event_type}</TableCell>
                    <TableCell>
                      <p className="text-sm">{l.recipient_name ?? "-"}</p>
                      <p className="text-xs text-muted-foreground">{l.recipient_phone}</p>
                    </TableCell>
                    <TableCell className="text-xs">{l.provider}</TableCell>
                    <TableCell><StatusBadge status={l.status} /></TableCell>
                    <TableCell className="text-right text-xs">
                      <span className="text-muted-foreground">{l.attempt_count ?? 1}x</span>
                      {l.status === "gagal" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-2"
                          disabled={retrying === l.id}
                          onClick={(e) => { e.stopPropagation(); retry(l.id); }}
                        >
                          {retrying === l.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <RefreshCw className="h-3.5 w-3.5" />}
                          <span className="ml-1">Kirim ulang</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded.has(l.id) && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/40">
                        <pre className="whitespace-pre-wrap rounded-lg bg-background p-3 font-sans text-sm">{l.message}</pre>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Percobaan terakhir: {formatTanggalWaktu(l.last_attempt_at ?? l.created_at)}
                        </p>
                        {l.error_message && (
                          <p className="mt-1 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                            Galat provider: {l.error_message}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
