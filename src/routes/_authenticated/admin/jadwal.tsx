import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Loader2, MapPin, Send } from "lucide-react";
import { getAppSettings } from "@/lib/common.functions";
import { updateAppSettings } from "@/lib/admin.functions";
import { formatTanggalWaktu } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/jadwal")({
  head: () => ({ meta: [{ title: "Jadwal Layanan — Bank Sampah Digital" }] }),
  component: JadwalPage,
});

function JadwalPage() {
  const settingsFn = useServerFn(getAppSettings);
  const updateFn = useServerFn(updateAppSettings);
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["app-settings"], queryFn: () => settingsFn() });

  const [pickupSchedule, setPickupSchedule] = useState("");
  const [dropoffInfo, setDropoffInfo] = useState("");
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setPickupSchedule(settings.pickupSchedule);
      setDropoffInfo(settings.dropoffInfo);
    }
  }, [settings]);

  async function submit() {
    setLoading(true);
    try {
      await updateFn({
        data: {
          pickupSchedule: pickupSchedule.trim(),
          dropoffInfo: dropoffInfo.trim(),
          notify,
        },
      });
      toast.success(
        notify
          ? "Jadwal disimpan dan notifikasi WhatsApp dikirim ke seluruh warga."
          : "Jadwal disimpan.",
      );
      await queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan jadwal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jadwal Layanan</h1>
        <p className="text-sm text-muted-foreground">
          Atur jadwal penjemputan rutin (misalnya seminggu sekali) dan info antar mandiri ke kantor
          bank sampah. Jadwal ini otomatis tampil di aplikasi warga dan tim.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Pengaturan Jadwal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="jadwal" className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-primary" /> Jadwal penjemputan rutin
            </Label>
            <Input
              id="jadwal"
              value={pickupSchedule}
              onChange={(e) => setPickupSchedule(e.target.value)}
              placeholder="Contoh: Setiap Sabtu, 08.00–12.00"
            />
            <p className="text-xs text-muted-foreground">
              Contoh untuk penarikan 1 minggu sekali: "Setiap Sabtu, 08.00–12.00".
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="antar" className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-accent" /> Info antar mandiri ke kantor
            </Label>
            <Input
              id="antar"
              value={dropoffInfo}
              onChange={(e) => setDropoffInfo(e.target.value)}
              placeholder="Contoh: Warga dapat mengantar langsung ke kantor bank sampah, Senin–Jumat 09.00–15.00"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
            />
            Kirim notifikasi WhatsApp ke seluruh warga tentang jadwal ini
          </label>
          {settings?.updatedAt && (
            <p className="text-xs italic text-muted-foreground">
              Jadwal terakhir diubah oleh Admin pada {formatTanggalWaktu(settings.updatedAt)}.
            </p>
          )}
          <Button onClick={() => void submit()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Simpan Jadwal
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
