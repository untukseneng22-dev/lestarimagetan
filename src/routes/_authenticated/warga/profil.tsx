import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Loader2, Phone, MapPin, Home } from "lucide-react";
import { toast } from "sonner";
import { updateMyProfile } from "@/lib/common.functions";
import { useMyAccount } from "@/lib/use-account";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoutButton } from "@/components/LogoutButton";

export const Route = createFileRoute("/_authenticated/warga/profil")({
  head: () => ({ meta: [{ title: "Profil — Bank Sampah Digital" }] }),
  component: ProfilPage,
});

function ProfilPage() {
  const { data: account } = useMyAccount();
  const updateFn = useServerFn(updateMyProfile);
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account) {
      setPhone(account.phone ?? "");
      setAddress(account.address ?? "");
    }
  }, [account]);

  if (!account) return null;

  async function save() {
    setLoading(true);
    try {
      await updateFn({ data: { phone: phone || undefined, address: address || undefined } });
      toast.success("Profil diperbarui");
      await queryClient.invalidateQueries({ queryKey: ["my-account"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui profil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col items-center p-5">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-border">
            <QRCode value={account.id} size={160} />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Tunjukkan QR ini ke petugas saat setor sampah
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Nama Lengkap</p>
            <p className="text-sm font-semibold">{account.fullName}</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Home className="h-4 w-4 text-primary" />
            <span>RT/RW: {account.rtRw ?? "-"}</span>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Nomor WhatsApp
            </Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Alamat
            </Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat rumah" />
          </div>
          <Button className="w-full" onClick={() => void save()} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Perubahan
          </Button>
        </CardContent>
      </Card>

      <LogoutButton variant="destructive" />
    </div>
  );
}
