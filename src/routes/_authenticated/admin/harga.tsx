import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { History, Loader2, Plus } from "lucide-react";
import {
  createCategory, getPriceHistory, listCategoriesAdmin, updateCategoryPrice,
} from "@/lib/admin.functions";
import { formatRupiah, formatTanggalWaktu } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/harga")({
  head: () => ({ meta: [{ title: "Harga Sampah — Bank Sampah Digital" }] }),
  component: HargaPage,
});

function HargaPage() {
  const listFn = useServerFn(listCategoriesAdmin);
  const historyFn = useServerFn(getPriceHistory);
  const createFn = useServerFn(createCategory);
  const updateFn = useServerFn(updateCategoryPrice);
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({ queryKey: ["admin-categories"], queryFn: () => listFn() });
  const { data: history } = useQuery({ queryKey: ["admin-price-history"], queryFn: () => historyFn() });
  const lastChange = history?.[0]?.effective_at;

  const [openCreate, setOpenCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("kg");
  const [newPrice, setNewPrice] = useState("");
  const [editTarget, setEditTarget] = useState<{ id: string; name: string; price: number } | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-price-history"] });
  }

  async function submitCreate() {
    const price = Number(newPrice);
    if (!newName.trim() || !newUnit.trim() || isNaN(price) || price < 0) {
      toast.error("Lengkapi nama, satuan, dan harga yang valid");
      return;
    }
    setLoading(true);
    try {
      await createFn({ data: { name: newName.trim(), unit: newUnit.trim(), price } });
      toast.success("Kategori baru ditambahkan dengan harga awal tercatat di histori.");
      setOpenCreate(false);
      setNewName(""); setNewUnit("kg"); setNewPrice("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah kategori");
    } finally {
      setLoading(false);
    }
  }

  async function submitUpdate() {
    if (!editTarget) return;
    const price = Number(editPrice);
    if (isNaN(price) || price < 0) {
      toast.error("Harga tidak valid");
      return;
    }
    setLoading(true);
    try {
      await updateFn({ data: { categoryId: editTarget.id, price } });
      toast.success("Harga diperbarui. Transaksi lama tetap memakai harga yang terkunci.");
      setEditTarget(null);
      setEditPrice("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui harga");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Harga Sampah</h1>
          <p className="text-sm text-muted-foreground">
            Setiap perubahan harga tercatat di histori. Transaksi mengunci harga yang berlaku pada tanggal setoran.
          </p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Kategori Baru</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Kategori Sampah</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="nama-kat">Nama kategori</Label>
                <Input id="nama-kat" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Contoh: Plastik PET" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="satuan">Satuan</Label>
                <Input id="satuan" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="kg" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="harga-awal">Harga awal per satuan (Rp)</Label>
                <Input id="harga-awal" type="number" min={0} value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="3000" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
              <Button disabled={loading} onClick={() => void submitCreate()}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Harga Berlaku Saat Ini</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kategori</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead>Harga Berlaku</TableHead>
                <TableHead>Berlaku Sejak</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(categories ?? []).map((c) => (
                <TableRow key={c.category_id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.unit}</TableCell>
                  <TableCell className="font-semibold text-accent">{formatRupiah(c.price_per_kg)}</TableCell>
                  <TableCell>{c.effective_at ? formatTanggalWaktu(c.effective_at) : "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditTarget({ id: c.category_id, name: c.name, price: c.price_per_kg }); setEditPrice(String(c.price_per_kg)); }}
                    >
                      Ubah Harga
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {lastChange && (
        <p className="-mt-3 text-xs italic text-muted-foreground">
          Harga terakhir diubah oleh Admin pada {formatTanggalWaktu(lastChange)}.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Histori Perubahan Harga</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu Perubahan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Harga Efektif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(history ?? []).map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{formatTanggalWaktu(h.effective_at)}</TableCell>
                  <TableCell>{h.waste_categories?.name ?? "-"}</TableCell>
                  <TableCell className="font-medium">{formatRupiah(Number(h.price_per_kg))} / {h.waste_categories?.unit ?? "kg"}</TableCell>
                </TableRow>
              ))}
              {(history ?? []).length === 0 && (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Belum ada histori harga.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editTarget !== null} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ubah Harga — {editTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Harga saat ini <b>{formatRupiah(editTarget?.price ?? 0)}</b>. Harga baru berlaku untuk setoran berikutnya; transaksi lama tidak berubah.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="harga-baru">Harga baru (Rp)</Label>
              <Input id="harga-baru" type="number" min={0} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Batal</Button>
            <Button disabled={loading} onClick={() => void submitUpdate()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Harga
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
