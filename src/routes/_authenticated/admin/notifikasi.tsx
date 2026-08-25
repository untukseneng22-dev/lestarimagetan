import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { listNotificationLogs } from "@/lib/admin.functions";
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
  const { data: rows, isLoading } = useQuery({ queryKey: ["admin-notif-logs"], queryFn: () => logsFn() });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Memuat…</TableCell></TableRow>
              )}
              {!isLoading && (rows ?? []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada notifikasi.</TableCell></TableRow>
              )}
              {(rows ?? []).map((l) => (
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
                  </TableRow>
                  {expanded.has(l.id) && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/40">
                        <pre className="whitespace-pre-wrap rounded-lg bg-background p-3 font-sans text-sm">{l.message}</pre>
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
