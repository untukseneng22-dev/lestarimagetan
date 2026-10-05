import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Truck } from "lucide-react";
import { toast } from "sonner";
import { requestPickup } from "@/lib/warga.functions";
import { todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function RequestPickupDialog({ defaultAddress }: { defaultAddress: string | null }) {
  const fn = useServerFn(requestPickup);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState(defaultAddress ?? "");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (address.trim().length < 5) { toast.error("Alamat minimal 5 karakter"); return; }
    setLoading(true);
    try {
      await fn({ data: { address: address.trim(), scheduledDate: date, notes: notes.trim() || undefined } });
      toast.success("Permintaan terkirim. Jadwal pasti akan tampil di Beranda setelah dikonfirmasi Admin.");
      setOpen(false);
      setNotes("");
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim permintaan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Truck className="mr-1.5 h-4 w-4" /> Minta Jemput di Luar Jadwal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Minta Penjemputan Khusus</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          Punya rosok/sampah bernilai dalam jumlah banyak? Ajukan di sini. Admin akan menetapkan tanggal
          jemput, dan statusnya tampil di kartu Jadwal Penjemputan pada Beranda.
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pk-date">Tanggal yang diinginkan</Label>
            <Input id="pk-date" type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pk-addr">Alamat</Label>
            <Input id="pk-addr" value={address} maxLength={255} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pk-notes">Keterangan barang</Label>
            <Textarea id="pk-notes" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="contoh: 3 karung kardus, 1 karung botol plastik, besi bekas" />
          </div>
          <Button className="w-full" onClick={() => void submit()} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kirim Permintaan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
