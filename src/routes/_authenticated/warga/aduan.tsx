import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Camera, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createComplaint, getMyComplaints } from "@/lib/warga.functions";
import { useMyAccount } from "@/lib/use-account";
import { formatTanggalWaktu } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/warga/aduan")({
  head: () => ({ meta: [{ title: "Aduan — Bank Sampah Digital" }] }),
  component: AduanPage,
});

function AduanPage() {
  const complaintsFn = useServerFn(getMyComplaints);
  const createFn = useServerFn(createComplaint);
  const queryClient = useQueryClient();
  const { data: account } = useMyAccount();
  const { data } = useQuery({ queryKey: ["my-complaints"], queryFn: () => complaintsFn() });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!account) return;
    if (title.trim().length < 5 || description.trim().length < 10) {
      toast.error("Judul minimal 5 karakter dan isi minimal 10 karakter");
      return;
    }
    setLoading(true);
    try {
      let photoPath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "jpg";
        photoPath = `${account.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("aduan").upload(photoPath, file);
        if (upErr) throw new Error("Gagal mengunggah foto: " + upErr.message);
      }
      await createFn({ data: { title: title.trim(), description: description.trim(), photoUrl: photoPath } });
      toast.success("Aduan terkirim. Admin mendapat notifikasi WhatsApp.");
      setOpen(false);
      setTitle("");
      setDescription("");
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ["my-complaints"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim aduan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Aduan Saya</h2>
          <p className="text-xs text-muted-foreground">Laporkan kendala layanan bank sampah.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Buat
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Aduan</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="judul">Judul</Label>
                <Input id="judul" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="contoh: Sampah belum dijemput" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="isi">Isi Aduan</Label>
                <Textarea id="isi" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jelaskan kendala yang Anda alami..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="foto">Foto (opsional)</Label>
                <label
                  htmlFor="foto"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-3 py-3 text-sm text-muted-foreground hover:bg-muted/50"
                >
                  <Camera className="h-4 w-4" />
                  {file ? file.name : "Pilih foto"}
                </label>
                <Input id="foto" type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button className="w-full" onClick={() => void submit()} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kirim Aduan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!data ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada aduan.</p>
      ) : (
        <div className="space-y-2">
          {data.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{c.title}</p>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
                {c.photo_signed_url && (
                  <img src={c.photo_signed_url} alt={`Foto aduan: ${c.title}`} className="mt-2 h-32 w-full rounded-lg object-cover" loading="lazy" />
                )}
                {c.response && (
                  <div className="mt-2 rounded-lg bg-primary/5 p-2.5">
                    <p className="text-[11px] font-semibold text-primary">Tanggapan Admin</p>
                    <p className="text-xs text-foreground">{c.response}</p>
                  </div>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">{formatTanggalWaktu(c.created_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
