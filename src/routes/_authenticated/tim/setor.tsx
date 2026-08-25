import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Lock, Plus, ScanLine, Search, Trash2, UserRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createDeposit, searchResidents } from "@/lib/tim.functions";
import { getCategoriesWithPrices } from "@/lib/common.functions";
import { formatNumber, formatRupiah, todayISO } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Html5Qrcode } from "html5-qrcode";

export const Route = createFileRoute("/_authenticated/tim/setor")({
  head: () => ({ meta: [{ title: "Setor Sampah — Bank Sampah Digital" }] }),
  component: SetorPage,
});

type Resident = { id: string; full_name: string; phone: string | null; address: string | null; rt: string | null };
type CalcItem = { categoryId: string; weight: string };

function SetorPage() {
  const searchFn = useServerFn(searchResidents);
  const pricesFn = useServerFn(getCategoriesWithPrices);
  const depositFn = useServerFn(createDeposit);
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Resident[]>([]);
  const [resident, setResident] = useState<Resident | null>(null);
  const [items, setItems] = useState<CalcItem[]>([{ categoryId: "", weight: "" }]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [lastDeposit, setLastDeposit] = useState<{ totalAmount: number; newBalance: number } | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Kamera pemindai QR — aktif hanya saat dialog terbuka.
  useEffect(() => {
    if (!scanOpen) return;
    let disposed = false;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (disposed) return;
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded) => {
            if (disposed) return;
            disposed = true;
            setScanOpen(false);
            setQuery(decoded);
            void doSearch(decoded);
          },
          () => {},
        );
      } catch {
        if (!disposed) {
          toast.error("Kamera tidak dapat diakses. Periksa izin kamera.");
          setScanOpen(false);
        }
      }
    }
    void startScanner();

    return () => {
      disposed = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanOpen]);

  const { data: priceData } = useQuery({ queryKey: ["prices"], queryFn: () => pricesFn() });
  const categories = useMemo(() => priceData?.categories ?? [], [priceData]);

  const priceMap = useMemo(
    () => new Map(categories.map((c) => [c.category_id, c])),
    [categories],
  );

  const total = items.reduce((sum, it) => {
    const cat = priceMap.get(it.categoryId);
    const w = Number(it.weight);
    if (!cat || !w) return sum;
    return sum + Math.round(w * cat.price_per_kg);
  }, 0);

  async function doSearch(value?: string) {
    setSearching(true);
    try {
      const res = await searchFn({ data: { query: value ?? query } });
      setResults(res as Resident[]);
      if (value && res.length === 1) {
        // Hasil pindai QR umumnya tepat satu warga — langsung pilih.
        setResident(res[0] as Resident);
        setResults([]);
      }
    } finally {
      setSearching(false);
    }
  }

  function updateItem(index: number, patch: Partial<CalcItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  async function submit() {
    if (!resident) return;
    const valid = items.filter((it) => it.categoryId && Number(it.weight) > 0);
    if (valid.length === 0) {
      toast.error("Isi minimal satu jenis sampah dengan berat valid");
      return;
    }
    setLoading(true);
    try {
      const res = await depositFn({
        data: {
          residentId: resident.id,
          depositDate: todayISO(),
          items: valid.map((it) => ({ categoryId: it.categoryId, weight: Number(it.weight) })),
        },
      });
      setLastDeposit({ totalAmount: res.totalAmount, newBalance: res.newBalance });
      toast.success(`Setoran ${formatRupiah(res.totalAmount)} tercatat. Notifikasi WhatsApp dikirim ke warga.`);
      setResident(null);
      setItems([{ categoryId: "", weight: "" }]);
      setResults([]);
      setQuery("");
      await queryClient.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan setoran");
    } finally {
      setLoading(false);
    }
  }

  if (lastDeposit) {
    return (
      <Card className="border-accent/30">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-accent" />
          <h2 className="text-lg font-bold">Setoran Berhasil</h2>
          <p className="text-sm text-muted-foreground">
            Nilai setoran: <span className="font-semibold text-foreground">{formatRupiah(lastDeposit.totalAmount)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Saldo warga sekarang: <span className="font-semibold text-accent">{formatRupiah(lastDeposit.newBalance)}</span>
          </p>
          <Button className="w-full" onClick={() => setLastDeposit(null)}>Setor Lagi</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <Label className="text-sm font-semibold">Cari Warga (nama / No. WA / ID QR)</Label>
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="Ketik nama, nomor WA, atau tempel ID dari QR"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void doSearch()}
            />
            <Button onClick={() => void doSearch()} disabled={searching} size="icon" aria-label="Cari warga">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {results.length > 0 && !resident && (
            <div className="mt-2 divide-y divide-border rounded-lg border border-border">
              {results.map((r) => (
                <button
                  key={r.id}
                  className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50"
                  onClick={() => {
                    setResident(r);
                    setResults([]);
                  }}
                >
                  <UserRound className="h-5 w-5 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.phone ?? "-"} · RT {r.rt ?? "-"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {resident && (
        <>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-bold">{resident.full_name}</p>
                <p className="text-xs text-muted-foreground">{resident.phone ?? "-"} · {resident.address ?? "-"}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setResident(null)}>Ganti</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Lock className="h-4 w-4 text-accent" /> Penimbangan (harga terkunci per tanggal setoran)
              </p>
              {items.map((it, i) => {
                const cat = priceMap.get(it.categoryId);
                const subtotal = cat && Number(it.weight) > 0 ? Math.round(Number(it.weight) * cat.price_per_kg) : 0;
                return (
                  <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Select value={it.categoryId} onValueChange={(v) => updateItem(i, { categoryId: v })}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Jenis sampah" />
                        </SelectTrigger>
                        <SelectContent>
                          {(categories ?? []).map((c) => (
                            <SelectItem key={c.category_id} value={c.category_id}>
                              {c.name} — {formatRupiah(c.price_per_kg)}/{c.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Hapus baris"
                          onClick={() => setItems((prev) => prev.filter((_, x) => x !== i))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        placeholder="Berat (kg)"
                        value={it.weight}
                        onChange={(e) => updateItem(i, { weight: e.target.value })}
                      />
                      <span className="w-28 text-right text-sm font-semibold text-primary">
                        {formatRupiah(subtotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setItems((prev) => [...prev, { categoryId: "", weight: "" }])}
              >
                <Plus className="mr-1 h-4 w-4" /> Tambah Jenis
              </Button>
              <div className="flex items-center justify-between rounded-lg bg-primary px-3 py-2.5 text-primary-foreground">
                <span className="text-sm font-medium">Total Setoran</span>
                <span className="text-lg font-bold">{formatRupiah(total)}</span>
              </div>
              <Button className="w-full" onClick={() => void submit()} disabled={loading || total === 0}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Setoran ({formatNumber(items.reduce((s, it) => s + (Number(it.weight) || 0), 0))} kg)
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
