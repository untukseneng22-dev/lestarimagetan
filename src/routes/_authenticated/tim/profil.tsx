import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, Phone, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { updateMyProfile } from "@/lib/common.functions";
import { useMyAccount } from "@/lib/use-account";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoutButton } from "@/components/LogoutButton";

export const Route = createFileRoute("/_authenticated/tim/profil")({
  head: () => ({ meta: [{ title: "Profil Petugas — Bank Sampah Digital" }] }),
  component: TimProfilPage,
});

function TimProfilPage() {
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
      <Card className="overflow-hidden">
        <div className="bg-gradient-primary flex items-center gap-3 p-5 text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold backdrop-blur">
            {account.fullName?.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-bold">{account.fullName}</p>
            <p className="flex items-center gap-1 text-xs text-white/80">
              <ShieldCheck className="h-3.5 w-3.5" /> Petugas Lapangan
            </p>
          </div>
        </div>
        <CardContent className="space-y-3 p-4">
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
