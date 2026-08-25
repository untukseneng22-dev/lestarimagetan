import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageSquareWarning, Reply } from "lucide-react";
import { listComplaintsAdmin, respondComplaint } from "@/lib/admin.functions";
import { formatTanggalWaktu } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/aduan")({
  head: () => ({ meta: [{ title: "Aduan Warga — LESTARI MAGETAN" }] }),
  component: AduanAdminPage,
});

type ComplaintRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  response: string | null;
  photo_signed_url: string | null;
  resident_name: string;
  resident_phone: string | null;
  created_at: string;
};

function AduanAdminPage() {
  const listFn = useServerFn(listComplaintsAdmin);
  const respondFn = useServerFn(respondComplaint);
  const queryClient = useQueryClient();

  const { data: rows } = useQuery({ queryKey: ["admin-complaints"], queryFn: () => listFn() });
  const [target, setTarget] = useState<ComplaintRow | null>(null);
  const [status, setStatus] = useState<"baru" | "diproses" | "selesai">("diproses");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!target) return;
    setLoading(true);
    try {
      await respondFn({ data: { complaintId: target.id, status, response: response.trim() || undefined } });
      toast.success("Tanggapan tersimpan. Warga menerima notifikasi WhatsApp.");
      setTarget(null);
      setResponse("");
      await queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan tanggapan");
    } finally {
      setLoading(false);
    }
  }

  const list = (rows ?? []) as ComplaintRow[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Aduan Warga</h1>
        <p className="text-sm text-muted-foreground">Tanggapi aduan dan perbarui statusnya.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {list.length === 0 && (
          <Card className="lg:col-span-2"><CardContent className="py-8 text-center text-sm text-muted-foreground">Belum ada aduan.</CardContent></Card>
        )}
        {list.map((c) => (
          <Card key={c.id}>
            <CardContent className="space-y-3 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <MessageSquareWarning className="h-4 w-4 text-amber-500" />
                    <p className="font-semibold">{c.title}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.resident_name}{c.resident_phone ? ` · ${c.resident_phone}` : ""} · {formatTanggalWaktu(c.created_at)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{c.description}</p>
              {c.photo_signed_url && (
                <a href={c.photo_signed_url} target="_blank" rel="noreferrer">
                  <img
                    src={c.photo_signed_url}
                    alt={`Foto aduan ${c.title}`}
                    className="h-36 w-full rounded-lg border border-border object-cover transition-opacity hover:opacity-90"
                    loading="lazy"
                  />
                </a>
              )}
              {c.response && (
                <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm"><b>Tanggapan:</b> {c.response}</p>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTarget(c);
                  setStatus((c.status === "baru" || c.status === "diproses" || c.status === "selesai") ? c.status : "diproses");
                  setResponse(c.response ?? "");
                }}
              >
                <Reply className="h-4 w-4" /> Tanggapi
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tanggapi — {target?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "baru" | "diproses" | "selesai")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baru">Baru</SelectItem>
                  <SelectItem value="diproses">Diproses</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tanggapan">Tanggapan</Label>
              <Textarea
                id="tanggapan"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={4}
                placeholder="Tulis tindak lanjut untuk warga…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Batal</Button>
            <Button disabled={loading} onClick={() => void submit()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Tanggapan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
