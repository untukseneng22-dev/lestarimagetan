import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Loader2, Save, UserRound } from "lucide-react";
import { getAppSettings } from "@/lib/common.functions";
import { updateOrgProfile } from "@/lib/admin.functions";
import { formatTanggalWaktu } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/identitas")({
  head: () => ({ meta: [{ title: "Identitas Lembaga — LESTARI MAGETAN" }] }),
  component: IdentitasPage,
});

function IdentitasPage() {
  const settingsFn = useServerFn(getAppSettings);
  const saveFn = useServerFn(updateOrgProfile);
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["app-settings"], queryFn: () => settingsFn() });

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    city: "",
    headName: "",
    treasurerName: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (settings?.org) {
      setForm({
        name: settings.org.name,
        address: settings.org.address,
        phone: settings.org.phone,
        city: settings.org.city,
        headName: settings.org.headName,
        treasurerName: settings.org.treasurerName,
      });
    }
  }, [settings]);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setLoading(true);
    try {
      await saveFn({
        data: {
          name: form.name.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          city: form.city.trim(),
          headName: form.headName.trim(),
          treasurerName: form.treasurerName.trim(),
        },
      });
      toast.success("Identitas lembaga tersimpan dan langsung dipakai pada kop laporan.");
      await queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan identitas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Identitas Lembaga</h1>
        <p className="text-sm text-muted-foreground">
          Data ini dipakai sebagai kop dan kolom tanda tangan pada dokumen laporan bulanan yang
          diekspor ke PDF maupun Excel.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" /> Data Bank Sampah
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nama">Nama bank sampah</Label>
              <Input
                id="nama"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Contoh: Bank Sampah Lestari Magetan"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alamat">Alamat lengkap</Label>
              <Input
                id="alamat"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Contoh: Jl. Raya Maospati No. 10, Magetan, Jawa Timur"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="telp">Telp/WA</Label>
                <Input
                  id="telp"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="0812xxxxxxx"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kota">Kota penandatanganan</Label>
                <Input
                  id="kota"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Magetan"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-accent" /> Pengurus Penanda Tangan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ketua">Nama ketua</Label>
              <Input
                id="ketua"
                value={form.headName}
                onChange={(e) => set("headName", e.target.value)}
                placeholder="Nama lengkap ketua bank sampah"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bendahara">Nama bendahara</Label>
              <Input
                id="bendahara"
                value={form.treasurerName}
                onChange={(e) => set("treasurerName", e.target.value)}
                placeholder="Nama lengkap bendahara"
              />
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              Pratinjau kop laporan:
              <div className="mt-2 rounded-lg bg-background p-3 text-center">
                <p className="text-sm font-bold uppercase">{form.name || "Nama bank sampah"}</p>
                <p className="text-xs text-muted-foreground">
                  {[form.address, form.phone ? `Telp/WA: ${form.phone}` : ""].filter(Boolean).join(" · ") ||
                    "Alamat belum diisi"}
                </p>
                <div className="mt-2 h-px bg-primary/60" />
                <p className="mt-2 text-[11px]">
                  Ketua: {form.headName || "—"} · Bendahara: {form.treasurerName || "—"}
                </p>
              </div>
            </div>
            {settings?.org?.updatedAt && (
              <p className="text-xs italic text-muted-foreground">
                Terakhir diperbarui pada {formatTanggalWaktu(settings.org.updatedAt)}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Button onClick={() => void submit()} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Simpan Identitas
      </Button>
    </div>
  );
}
