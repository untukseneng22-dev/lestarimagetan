import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import QRCode from "react-qr-code";
import { ArrowLeft, Printer } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { listUsers } from "@/lib/admin.functions";
import { useMyAccount } from "@/lib/use-account";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/kartu")({
  validateSearch: (search: Record<string, unknown>) => ({
    semua: search["semua"] === true || search["semua"] === "1",
  }),
  head: () => ({
    meta: [
      { title: "Kartu QR — LESTARI MAGETAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KartuPage,
});

type KartuRow = { id: string; full_name: string; address: string | null; rt: string | null };

function KartuPage() {
  const { semua } = Route.useSearch();
  const router = useRouter();
  const { data: account } = useMyAccount();
  const listFn = useServerFn(listUsers);
  const isAdminAll = semua && account?.role === "admin";
  const { data: wargaList } = useQuery({
    queryKey: ["kartu-semua-warga"],
    queryFn: () => listFn({ data: { role: "warga" } }),
    enabled: isAdminAll,
  });
  const printedRef = useRef(false);

  const cards: KartuRow[] = isAdminAll
    ? (wargaList ?? [])
    : account
      ? [{ id: account.id, full_name: account.fullName, address: account.address, rt: account.rt }]
      : [];

  const ready = cards.length > 0;

  // Dialog cetak terbuka otomatis begitu kartu siap.
  useEffect(() => {
    if (!ready || printedRef.current) return;
    printedRef.current = true;
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [ready]);

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <Button variant="outline" size="sm" onClick={() => router.history.back()}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Cetak
          </Button>
        </div>

        {!ready ? (
          <Skeleton className="h-64 w-full rounded-2xl print:hidden" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-3">
            {cards.map((p) => (
              <div
                key={p.id}
                className="break-inside-avoid rounded-2xl border-2 border-foreground/70 bg-white p-4 text-center text-foreground"
              >
                <div className="flex items-center justify-center gap-1.5 border-b border-dashed border-foreground/40 pb-2">
                  <BrandLogo className="h-5 w-5" />
                  <p className="text-xs font-extrabold tracking-wide">KARTU ANGGOTA BANK SAMPAH</p>
                </div>
                <div className="mx-auto mt-3 w-fit rounded-lg bg-white p-2">
                  <QRCode value={p.id} size={140} />
                </div>
                <p className="mt-2 text-sm font-bold">{p.full_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {p.address ?? "-"}
                  {p.rt ? ` · RT ${p.rt}` : ""}
                </p>
                <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                  Tempel kartu ini di depan rumah. Petugas memindai QR saat penjemputan, termasuk
                  bila penghuni tidak di tempat.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
