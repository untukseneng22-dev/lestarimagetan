import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Megaphone, Plus, Trash2 } from "lucide-react";
import { getAnnouncements } from "@/lib/common.functions";
import { createAnnouncement, deleteAnnouncement } from "@/lib/admin.functions";
import { formatTanggalWaktu } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/pengumuman")({
  head: () => ({ meta: [{ title: "Pengumuman — Bank Sampah Digital" }] }),
  component: PengumumanPage,
});

function PengumumanPage() {
  const listFn = useServerFn(getAnnouncements);
  const createFn = useServerFn(createAnnouncement);
  const deleteFn = useServerFn(deleteAnnouncement);
  const queryClient = useQueryClient();

  const { data: rows } = useQuery({ queryKey: ["announcements"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (title.trim().length < 5 || body.trim().length < 10) {
      toast.error("Judul minimal 5 karakter dan isi minimal 10 karakter");
      return;
    }
    setLoading(true);
    try {
      await createFn({ data: { title: title.trim(), body: body.trim() } });
      toast.success("Pengumuman diterbitkan ke dashboard warga.");
      setOpen(false);
      setTitle("");
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["announcements"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menerbitkan");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteFn({ data: { id } });
      toast.success("Pengumuman dihapus.");
      await queryClient.invalidateQueries({ queryKey: ["announcements"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pengumuman</h1>
          <p className="text-sm text-muted-foreground">Informasi yang tampil di dashboard warga.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Pengumuman Baru</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Buat Pengumuman</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="judul">Judul</Label>
                <Input id="judul" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Jadwal libur lebaran" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="isi">Isi pengumuman</Label>
                <Textarea id="isi" value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Tulis isi pengumuman…" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button disabled={loading} onClick={() => void submit()}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Terbitkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {(rows ?? []).length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Belum ada pengumuman.</CardContent></Card>
        )}
        {(rows ?? []).map((a) => (
          <Card key={a.id}>
            <CardContent className="flex items-start justify-between gap-3 py-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 shrink-0 text-primary" />
                  <p className="font-semibold">{a.title}</p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                <p className="text-xs text-muted-foreground">{formatTanggalWaktu(a.published_at)}</p>
              </div>
              <Button size="sm" variant="ghost" className="shrink-0 text-destructive hover:text-destructive" onClick={() => void remove(a.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
