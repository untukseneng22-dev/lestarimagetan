import { createFileRoute, Link } from "@tanstack/react-router";
import QRCode from "react-qr-code";
import { Phone, MapPin, Home, User, Printer } from "lucide-react";
import { useMyAccount } from "@/lib/use-account";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/AvatarUpload";
import { LogoutButton } from "@/components/LogoutButton";

export const Route = createFileRoute("/_authenticated/warga/profil")({
  head: () => ({ meta: [{ title: "Profil — Bank Sampah Digital" }] }),
  component: ProfilPage,
});

function ProfilPage() {
  const { data: account } = useMyAccount();

  if (!account) return null;

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
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/kartu" search={{ semua: false }}>
              <Printer className="mr-1.5 h-4 w-4" /> Cetak Kartu QR
            </Link>
          </Button>
          <p className="mt-2 max-w-60 text-center text-[11px] text-muted-foreground">
            Cetak dan tempel di depan rumah — petugas dapat memindai kartu saat penjemputan bila
            Anda tidak di tempat.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <AvatarUpload userId={account.id} name={account.fullName} avatarUrl={account.avatarUrl} />
            <div className="min-w-0">
              <p className="truncate text-base font-bold">{account.fullName}</p>
              <p className="text-xs text-muted-foreground">Warga Bank Sampah</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Ketuk foto untuk mengganti foto profil
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 truncate">{account.fullName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Home className="h-4 w-4 shrink-0 text-primary" />
              <span>RT/RW: {account.rt ?? "-"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              <span>{account.phone ?? "-"}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">{account.address ?? "-"}</span>
            </div>
            <p className="rounded-xl bg-muted px-3 py-2 text-[11px] text-muted-foreground">
              Data diri hanya dapat diubah oleh Admin. Hubungi Admin atau RT bila ada data yang perlu diperbarui.
            </p>
          </div>
        </CardContent>
      </Card>

      <LogoutButton variant="destructive" />
    </div>
  );
}
