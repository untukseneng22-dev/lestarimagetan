import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImagePlus, ImageOff, Loader2, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { adminListProducts, saveProduct, deleteProduct, removeProductPhoto, updateShippingFee, updateMarketLimits } from "@/lib/admin.functions";
import { ProductThumb } from "@/components/ProductThumb";
import { compressImage } from "@/lib/image";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/produk")({
  head: () => ({
    meta: [
      { title: "Produk Marketplace — LESTARI MAGETAN" },
      { name: "description", content: "Kelola katalog sembako dan tarif ongkir marketplace bank sampah." },
    ],
  }),
  component: ProdukPage,
});

type FormState = {
  id: string | null;
  name: string;
  category: string;
  unit: string;
  price: string;
  stock: string;
  isActive: boolean;
  photoUrl: string | null;
  photoPreview: string | null;
};

const EMPTY: FormState = {
  id: null, name: "", category: "Sembako", unit: "pcs", price: "", stock: "0", isActive: true,
  photoUrl: null, photoPreview: null,
};


function ProdukPage() {
  const listFn = useServerFn(adminListProducts);
  const saveFn = useServerFn(saveProduct);
  const deleteFn = useServerFn(deleteProduct);
  const removePhotoFn = useServerFn(removeProductPhoto);
  const feeFn = useServerFn(updateShippingFee);
  const limitFn = useServerFn(updateMarketLimits);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => listFn(),
    // URL foto ditandatangani 24 jam; cache 10 menit agar tabel besar tidak
    // memuat ulang gambar setiap kali halaman dibuka.
    staleTime: 10 * 60 * 1000,
  });
  const [form, setForm] = useState<FormState>(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fee, setFee] = useState<string | null>(null);
  const [maxQty, setMaxQty] = useState<string | null>(null);
  const [maxOrders, setMaxOrders] = useState<string | null>(null);

  const feeValue = fee ?? String(data?.shippingFee ?? 0);
  const maxQtyValue = maxQty ?? String(data?.limits.maxQtyPerProduct ?? 5);
  const maxOrdersValue = maxOrders ?? String(data?.limits.maxActiveOrders ?? 3);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    await queryClient.invalidateQueries({ queryKey: ["market-catalog"] });
  }

  /** Foto dikompres di browser (maks 1000px, JPEG) sebelum diunggah agar ringan. */
  async function handlePhoto(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxDim: 1000, quality: 0.7 });
      const path = `produk/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await supabase.storage
        .from("produk")
        .upload(path, compressed, { contentType: "image/jpeg" });
      if (error) throw new Error(error.message);
      const { data: signed } = await supabase.storage.from("produk").createSignedUrl(path, 3600);
      setForm((f) => ({ ...f, photoUrl: path, photoPreview: signed?.signedUrl ?? null }));
      toast.success(`Foto siap (${Math.round(compressed.size / 1024)} KB setelah kompresi).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah foto");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setSaving(true);
    try {
      await saveFn({
        data: {
          id: form.id,
          name: form.name.trim(),
          category: form.category.trim(),
          unit: form.unit.trim(),
          price: Number(form.price) || 0,
          stock: Number(form.stock) || 0,
          photoUrl: form.photoUrl,
          isActive: form.isActive,
        },
      });

      toast.success(form.id ? "Produk diperbarui." : "Produk ditambahkan.");
      setOpen(false);
      setForm(EMPTY);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan produk");
    } finally {
      setSaving(false);
    }
  }

  async function dropPhoto(id: string) {
    try {
      await removePhotoFn({ data: { id } });
      setForm((f) => (f.id === id ? { ...f, photoUrl: null, photoPreview: null } : f));
      toast.success("Foto dihapus. Katalog memakai gambar placeholder.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus foto");
    }
  }

  async function remove(id: string) {
    try {
      await deleteFn({ data: { id } });
      toast.success("Produk dihapus.");
      await refresh();
    } catch {
      toast.error("Produk tidak bisa dihapus karena sudah dipakai pesanan. Nonaktifkan saja.");
    }
  }

  async function saveFee() {
    try {
      await feeFn({ data: { fee: Number(feeValue) || 0 } });
      toast.success("Tarif ongkir disimpan.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan ongkir");
    }
  }

  async function saveLimits() {
    try {
      await limitFn({
        data: {
          maxQtyPerProduct: Math.max(1, Number(maxQtyValue) || 1),
          maxActiveOrders: Math.max(1, Number(maxOrdersValue) || 1),
        },
      });
      toast.success("Batas pembelian warga disimpan.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan batas pembelian");
    }
  }

  if (!data) return <Skeleton className="h-96 w-full rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Produk Marketplace</h1>
          <p className="text-xs text-muted-foreground">
            Katalog sembako yang bisa ditukar warga dengan saldo tabungan.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setForm(EMPTY);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setForm(EMPTY)}>
              <Plus className="mr-1.5 h-4 w-4" /> Tambah Produk
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Nama produk</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Kategori</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Satuan</Label>
                  <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Harga (Rp)</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Stok</Label>
                  <Input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Foto produk</Label>
                <div className="flex items-center gap-3">
                  {form.photoPreview ? (
                    <ProductThumb src={form.photoPreview} alt={form.name || "Foto produk"} size="lg" />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted">
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="grid gap-1.5">
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {uploading ? "Mengompres & mengunggah…" : "Foto otomatis dikompres (maks 1000px) agar ringan."}
                    </p>
                    {form.id && form.photoUrl && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-fit"
                        onClick={() => dropPhoto(form.id!)}
                      >
                        <ImageOff className="mr-1.5 h-4 w-4" /> Hapus foto (pakai placeholder)
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label className="text-sm">Tampilkan di marketplace</Label>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
              </div>

            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={saving || form.name.trim().length < 2}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-primary" /> Tarif Ongkir Antar (flat)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid w-40 gap-1.5">
            <Label className="text-xs">Ongkir (Rp)</Label>
            <Input type="number" value={feeValue} onChange={(e) => setFee(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={saveFee}>Simpan Ongkir</Button>
          <p className="text-xs text-muted-foreground">
            Berlaku untuk pesanan yang diantar petugas ke rumah warga.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Batas Pembelian per Warga</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid w-44 gap-1.5">
            <Label className="text-xs">Maks qty per produk</Label>
            <Input type="number" min={1} value={maxQtyValue} onChange={(e) => setMaxQty(e.target.value)} />
          </div>
          <div className="grid w-44 gap-1.5">
            <Label className="text-xs">Maks pesanan aktif</Label>
            <Input type="number" min={1} value={maxOrdersValue} onChange={(e) => setMaxOrders(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={saveLimits}>Simpan Batas</Button>
          <p className="text-xs text-muted-foreground">
            Mencegah stok diborong satu warga dan menumpuknya pesanan yang belum diterima.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2.5">
                      <ProductThumb src={p.photo_signed_url} alt={p.name} size="sm" />
                      <span className="min-w-0 truncate">{p.name}</span>
                    </span>
                  </TableCell>

                  <TableCell className="text-muted-foreground">{p.category}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {formatRupiah(Number(p.price))}
                    <span className="text-xs font-normal text-muted-foreground">/{p.unit}</span>
                  </TableCell>
                  <TableCell className="text-right">{p.stock}</TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? "default" : "secondary"}>
                      {p.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setForm({
                          id: p.id,
                          name: p.name,
                          category: p.category,
                          unit: p.unit,
                          price: String(p.price),
                          stock: String(p.stock),
                          isActive: p.is_active,
                          photoUrl: p.photo_url ?? null,
                          photoPreview: p.photo_signed_url ?? null,

                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus produk ini?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {p.name} akan dihapus dari katalog. Tindakan ini tidak bisa dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(p.id)}>Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
