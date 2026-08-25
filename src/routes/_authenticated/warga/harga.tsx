import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Tag } from "lucide-react";
import { getCategoriesWithPrices } from "@/lib/common.functions";
import { formatRupiah, formatTanggalWaktu } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/warga/harga")({
  head: () => ({ meta: [{ title: "Daftar Harga — Bank Sampah Digital" }] }),
  component: HargaPage,
});

function HargaPage() {
  const pricesFn = useServerFn(getCategoriesWithPrices);
  const { data } = useQuery({ queryKey: ["prices"], queryFn: () => pricesFn() });

  if (!data) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">Harga Sampah Hari Ini</h2>
        <p className="text-xs text-muted-foreground">
          Harga yang tercatat saat setoran mengikuti harga pada tanggal setoran (terkunci).
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {data.map((c) => (
          <Card key={c.category_id}>
            <CardContent className="p-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
                <Tag className="h-4 w-4 text-accent" />
              </div>
              <p className="mt-2 text-sm font-semibold leading-tight">{c.name}</p>
              <p className="mt-1 text-base font-bold text-primary">
                {formatRupiah(c.price_per_kg)}
                <span className="text-xs font-normal text-muted-foreground">/{c.unit}</span>
              </p>
              {c.effective_at && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Berlaku sejak {formatTanggalWaktu(c.effective_at)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
