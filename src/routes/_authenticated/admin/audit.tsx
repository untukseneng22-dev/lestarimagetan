import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ScrollText } from "lucide-react";
import { listAuditLogs } from "@/lib/admin.functions";
import { formatTanggalWaktu } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log Admin — LESTARI MAGETAN" },
      { name: "description", content: "Jejak tindakan admin pada katalog produk dan data marketplace bank sampah." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const logsFn = useServerFn(listAuditLogs);
  const { data, isLoading } = useQuery({ queryKey: ["admin-audit"], queryFn: () => logsFn() });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Audit Log Admin</h1>
        <p className="text-xs text-muted-foreground">
          Catatan tindakan admin (200 terbaru), termasuk penghapusan foto produk.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="m-4 h-64 rounded-xl" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Waktu</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Tindakan</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      <ScrollText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      Belum ada aktivitas tercatat.
                    </TableCell>
                  </TableRow>
                ) : (
                  (data ?? []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTanggalWaktu(l.created_at)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{l.actor_name ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">{l.action}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.detail ?? "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
