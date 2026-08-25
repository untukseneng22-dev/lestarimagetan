import { createFileRoute } from "@tanstack/react-router";
import { Phone, MapPin, ShieldCheck } from "lucide-react";
import { useMyAccount } from "@/lib/use-account";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarUpload } from "@/components/AvatarUpload";
import { LogoutButton } from "@/components/LogoutButton";

export const Route = createFileRoute("/_authenticated/tim/profil")({
  head: () => ({ meta: [{ title: "Profil Petugas — LESTARI MAGETAN" }] }),
  component: TimProfilPage,
});

function TimProfilPage() {
  const { data: account } = useMyAccount();

  if (!account) return null;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="bg-gradient-primary relative overflow-hidden p-5 text-primary-foreground">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-4">
            <AvatarUpload userId={account.id} name={account.fullName} avatarUrl={account.avatarUrl} tone="gradient" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold">{account.fullName}</p>
              <p className="flex items-center gap-1 text-xs text-primary-foreground/80">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> Petugas Lapangan
              </p>
              <p className="mt-1 text-[11px] text-primary-foreground/70">
                Ketuk foto untuk mengganti foto profil
              </p>
            </div>
          </div>
        </div>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 shrink-0 text-primary" />
            <span>{account.phone ?? "-"}</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0">{account.address ?? "-"}</span>
          </div>
          <p className="rounded-xl bg-muted px-3 py-2 text-[11px] text-muted-foreground">
            Data diri hanya dapat diubah oleh Admin. Hubungi Admin bila ada data yang perlu diperbarui.
          </p>
        </CardContent>
      </Card>

      <LogoutButton variant="destructive" />

      <AppVersion />
    </div>
  );
}
