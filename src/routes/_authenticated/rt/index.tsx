import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Plus, UserRound, QrCode } from "lucide-react";
import { toast } from "sonner";
import { listMyRegistrationRequests, submitRegistrationRequest } from "@/lib/rt.functions";
import { useMyAccount } from "@/lib/use-account";
import { formatTanggalWaktu } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/rt/")({
  head: () => ({ meta: [{ title: "Pengajuan Warga — Bank Sampah Digital" }] }),
  component: RtPage,
});

function RtPage() {
  const listFn = useServerFn(listMyRegistrationRequests);
  const submitFn = useServerFn(submitRegistrationRequest);
  const queryClient = useQueryClient();
  const { data: account } = useMyAccount();
  const { data } = useQuery({ queryKey: ["rt-requests"], queryFn: () => listFn() });

  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await submitFn({ data: { fullName, address, whatsappNumber: whatsapp } });
      toast.success("Pengajuan terkirim ke Admin Bank Sampah");
      setFullName("");
      setAddress("");
      setWhatsapp("");
      await queryClient.invalidateQueries({ queryKey: ["rt-requests"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim pengajuan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Pengajuan Warga Baru</h2>
        <p className="text-xs text-muted-foreground">
          {account?.fullName} · RT {account?.rt ?? "-"}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Plus className="h-4 w-4 text-primary" /> Formulir Pengajuan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nama">Nama Lengkap</Label>
            <Input id="nama" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama calon warga" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alamat">Alamat</Label>
            <Input id="alamat" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat rumah" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa">Nomor WhatsApp</Label>
            <Input id="wa" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="08xxxxxxxxxx" />
          </div>
          <Button className="w-full" onClick={() => void submit()} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ajukan ke Admin
          </Button>
        </CardContent>
      </Card>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Riwayat Pengajuan</h3>
        {!data ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada pengajuan.</p>
        ) : (
          <div className="space-y-2">
            {data.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">{r.full_name}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.address} · {r.whatsapp_number}</p>
                  {r.status === "ditolak" && r.reason && (
                    <p className="mt-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                      Alasan penolakan: {r.reason}
                    </p>
                  )}
                  {r.status === "disetujui" && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-accent">
                      <QrCode className="h-3.5 w-3.5" />
                      {r.account_created ? "Akun & QR warga sudah dibuat" : "Menunggu admin membuat akun"}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Diajukan {formatTanggalWaktu(r.created_at)}
                    {r.decided_at ? ` · Diputuskan ${formatTanggalWaktu(r.decided_at)}` : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
