import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ShoppingBasket, Plus, Minus, Wallet, Truck, Store, Loader2, PackageSearch, Search, XCircle,
} from "lucide-react";
import {
  getMarketCatalog,
  getMyOrders,
  createMarketOrder,
  confirmOrderReceived,
  cancelMyOrder,
} from "@/lib/market.functions";
import { OrderTimeline } from "@/components/OrderTimeline";
import { compressImage } from "@/lib/image";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah, formatTanggalWaktu } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/warga/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace Sembako — LESTARI MAGETAN" },
      {
        name: "description",
        content: "Tukar saldo tabungan sampah dengan sembako dan minta diantar petugas.",
      },
    ],
  }),
  component: MarketplacePage,
});

function MarketplacePage() {
  const catalogFn = useServerFn(getMarketCatalog);
  const ordersFn = useServerFn(getMyOrders);
  const orderFn = useServerFn(createMarketOrder);
  const confirmFn = useServerFn(confirmOrderReceived);
  const cancelFn = useServerFn(cancelMyOrder);
  const queryClient = useQueryClient();

  const { data } = useQuery({ queryKey: ["market-catalog"], queryFn: () => catalogFn() });
  const { data: orders } = useQuery({ queryKey: ["market-orders"], queryFn: () => ordersFn() });

  const [cart, setCart] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [method, setMethod] = useState<"antar" | "ambil">("antar");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addressTouched, setAddressTouched] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [proofs, setProofs] = useState<Record<string, File | null>>({});
  const [cancelling, setCancelling] = useState<string | null>(null);

  const maxQty = data?.limits.maxQtyPerProduct ?? 5;

  async function confirmReceived(orderId: string, file: File | null) {
    setConfirming(orderId);
    try {
      let proofUrl: string | null = null;
      if (file) {
        const compressed = await compressImage(file, { maxDim: 1280, quality: 0.7 });
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (uid) {
          const path = `${uid}/pesanan-${orderId}-${Date.now()}.jpg`;
          const { error } = await supabase.storage
            .from("aduan")
            .upload(path, compressed, { contentType: "image/jpeg" });
          if (error) throw new Error("Gagal mengunggah bukti: " + error.message);
          proofUrl = path;
        }
      }
      await confirmFn({ data: { orderId, proofUrl } });
      toast.success("Terima kasih! Pesanan ditandai diterima dan dikunci.");
      await queryClient.invalidateQueries({ queryKey: ["market-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["market-catalog"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengonfirmasi pesanan");
    } finally {
      setConfirming(null);
    }
  }

  async function cancelOrder(orderId: string) {
    setCancelling(orderId);
    try {
      const res = await cancelFn({ data: { orderId, reason: null } });
      toast.success(`Pesanan dibatalkan. Saldo ${formatRupiah(res.refunded)} kembali ke tabungan.`);
      await queryClient.invalidateQueries({ queryKey: ["market-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["market-catalog"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membatalkan pesanan");
    } finally {
      setCancelling(null);
    }
  }


  const products = data?.products ?? [];
  const categories = useMemo(
    () => ["Semua", ...new Set(products.map((p) => p.category))],
    [products],
  );
  const filtered = products.filter(
    (p) =>
      (category === "Semua" || p.category === category) &&
      p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const lines = products
    .filter((p) => (cart[p.id] ?? 0) > 0)
    .map((p) => ({ ...p, qty: cart[p.id] as number, subtotal: Number(p.price) * (cart[p.id] as number) }));
  const itemsTotal = lines.reduce((s, l) => s + l.subtotal, 0);
  const shipping = method === "antar" ? (data?.shippingFee ?? 0) : 0;
  const total = itemsTotal + shipping;
  const balance = data?.balance ?? 0;
  const paidFromBalance = Math.max(0, Math.min(balance, total));
  const cashDue = total - paidFromBalance;

  const effectiveAddress = addressTouched ? address : (data?.address ?? "");

  function setQty(id: string, qty: number, stock: number) {
    setCart((c) => {
      const next = { ...c };
      const clamped = Math.max(0, Math.min(qty, stock, maxQty));
      if (clamped === 0) delete next[id];
      else next[id] = clamped;
      return next;
    });
  }

  async function submit() {
    if (lines.length === 0) return;
    setSubmitting(true);
    try {
      await orderFn({
        data: {
          method,
          address: method === "antar" ? effectiveAddress.trim() : null,
          items: lines.map((l) => ({ productId: l.id, qty: l.qty })),
        },
      });
      toast.success("Pesanan terkirim! Menunggu konfirmasi admin.");
      setCart({});
      await queryClient.invalidateQueries({ queryKey: ["market-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["market-catalog"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat pesanan");
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) return <Skeleton className="h-72 w-full rounded-2xl" />;

  return (
    <div className="space-y-3 pb-28">
      <div className="rounded-2xl bg-gradient-primary p-4 text-primary-foreground shadow-elegant">
        <p className="flex items-center gap-1.5 text-xs text-primary-foreground/85">
          <ShoppingBasket className="h-3.5 w-3.5" /> Marketplace Bank Sampah
        </p>
        <p className="mt-1 text-sm font-semibold leading-snug">
          Tukar saldo tabunganmu dengan sembako, bisa diantar ke rumah.
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
          <Wallet className="h-3.5 w-3.5" /> Saldo {formatRupiah(balance)}
        </p>
      </div>

      <Tabs defaultValue="belanja">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="belanja">Belanja</TabsTrigger>
          <TabsTrigger value="pesanan">Pesanan Saya</TabsTrigger>
        </TabsList>

        <TabsContent value="belanja" className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari sembako…"
              className="pl-9"
            />
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  c === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {filtered.map((p) => {
              const qty = cart[p.id] ?? 0;
              const habis = p.stock <= 0;
              return (
                <Card key={p.id} className="overflow-hidden">
                  <div className="flex h-24 items-center justify-center bg-muted">
                    {p.photo_signed_url ? (
                      <img src={p.photo_signed_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <ShoppingBasket className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </div>
                  <CardContent className="space-y-1.5 p-3">
                    <p className="line-clamp-2 min-h-[2.2rem] text-xs font-semibold leading-snug">{p.name}</p>
                    <p className="text-sm font-bold text-primary">
                      {formatRupiah(Number(p.price))}
                      <span className="text-xs font-normal text-muted-foreground">/{p.unit}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {habis ? "Stok habis" : `Stok ${p.stock} · maks ${maxQty}/warga`}
                    </p>
                    {qty === 0 ? (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={habis}
                        onClick={() => setQty(p.id, 1, p.stock)}
                      >
                        Tambah
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg bg-muted p-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQty(p.id, qty - 1, p.stock)}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-sm font-bold">{qty}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQty(p.id, qty + 1, p.stock)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Produk tidak ditemukan.</p>
          )}

          {lines.length > 0 && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-bold">Ringkasan Pesanan</p>
                <div className="space-y-1">
                  {lines.map((l) => (
                    <div key={l.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {l.name} x{l.qty}
                      </span>
                      <span className="font-medium">{formatRupiah(l.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod("antar")}
                    className={cn(
                      "rounded-xl border p-2.5 text-left text-xs transition-colors",
                      method === "antar" ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <Truck className="mb-1 h-4 w-4 text-primary" />
                    <p className="font-semibold">Diantar</p>
                    <p className="text-muted-foreground">Ongkir {formatRupiah(data.shippingFee)}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("ambil")}
                    className={cn(
                      "rounded-xl border p-2.5 text-left text-xs transition-colors",
                      method === "ambil" ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <Store className="mb-1 h-4 w-4 text-primary" />
                    <p className="font-semibold">Ambil di kantor</p>
                    <p className="text-muted-foreground">Gratis ongkir</p>
                  </button>
                </div>

                {method === "antar" && (
                  <Textarea
                    value={effectiveAddress}
                    onChange={(e) => {
                      setAddressTouched(true);
                      setAddress(e.target.value);
                    }}
                    placeholder="Alamat pengantaran"
                    rows={2}
                    maxLength={255}
                  />
                )}

                <div className="space-y-1 rounded-xl bg-muted/60 p-3 text-xs">
                  <Row label="Subtotal belanja" value={formatRupiah(itemsTotal)} />
                  <Row label="Ongkir" value={formatRupiah(shipping)} />
                  <Row label="Total" value={formatRupiah(total)} bold />
                  <Row label="Dipotong saldo" value={`- ${formatRupiah(paidFromBalance)}`} />
                  <Row
                    label="Bayar tunai saat terima"
                    value={formatRupiah(cashDue)}
                    bold
                    tone={cashDue > 0 ? "warning" : undefined}
                  />
                </div>

                <Button className="w-full" onClick={submit} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Pesan Sekarang
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pesanan" className="space-y-2.5">
          {!orders || orders.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <PackageSearch className="mx-auto mb-2 h-8 w-8 opacity-50" />
              Belum ada pesanan.
            </div>
          ) : (
            orders.map((o) => (
              <Card key={o.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">#{o.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{formatTanggalWaktu(o.created_at)}</p>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="space-y-0.5">
                    {(o.market_order_items ?? []).map((it, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {it.product_name} x{it.qty}
                        </span>
                        <span>{formatRupiah(Number(it.subtotal))}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-0.5 border-t border-border pt-2 text-xs">
                    <Row
                      label={o.method === "antar" ? "Ongkir (diantar)" : "Ambil di kantor"}
                      value={formatRupiah(Number(o.shipping_fee))}
                    />
                    <Row label="Total" value={formatRupiah(Number(o.total_amount))} bold />
                    <Row label="Dipotong saldo" value={formatRupiah(Number(o.paid_from_balance))} />
                    {Number(o.cash_due) > 0 && (
                      <Row label="Bayar tunai" value={formatRupiah(Number(o.cash_due))} tone="warning" bold />
                    )}
                  </div>
                  {o.admin_note && (
                    <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                      Catatan admin: {o.admin_note}
                    </p>
                  )}

                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="mb-2 text-xs font-semibold">Pelacakan Pesanan</p>
                    <OrderTimeline events={o.market_order_events ?? []} status={o.status} />
                  </div>

                  {["diproses", "dikirim"].includes(o.status) && !o.locked && (
                    <div className="space-y-2 rounded-xl border border-dashed border-primary/40 p-3">
                      <p className="text-xs font-semibold">Barang sudah sampai?</p>
                      <p className="text-xs text-muted-foreground">
                        Unggah foto bukti terima (opsional), lalu konfirmasi. Setelah dikonfirmasi
                        pesanan dikunci dan tidak bisa diubah.
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        className="text-xs"
                        onChange={(e) => setProofs((s) => ({ ...s, [o.id]: e.target.files?.[0] ?? null }))}
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={confirming === o.id}
                        onClick={() => confirmReceived(o.id, proofs[o.id] ?? null)}
                      >
                        {confirming === o.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Konfirmasi Barang Diterima
                      </Button>
                    </div>
                  )}

                  {["menunggu", "dibayar", "diproses"].includes(o.status) && !o.locked && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="w-full" disabled={cancelling === o.id}>
                          {cancelling === o.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <XCircle className="mr-1.5 h-4 w-4" /> Batalkan Pesanan
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Batalkan pesanan ini?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Stok dikembalikan ke katalog dan saldo{" "}
                            {formatRupiah(Number(o.paid_from_balance))} kembali ke tabungan Anda.
                            Karena barang belum dikirim, ongkir tidak ditagihkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Tidak</AlertDialogCancel>
                          <AlertDialogAction onClick={() => cancelOrder(o.id)}>
                            Ya, batalkan
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}


                  {o.locked && o.received_at && (
                    <p className="text-xs text-muted-foreground">
                      Diterima pada {formatTanggalWaktu(o.received_at)} · pesanan terkunci.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean | undefined;
  tone?: "warning" | undefined;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          bold && "font-bold",
          tone === "warning" ? "text-accent-foreground" : bold && "text-primary",
        )}
      >
        {value}
      </span>
    </div>
  );
}
