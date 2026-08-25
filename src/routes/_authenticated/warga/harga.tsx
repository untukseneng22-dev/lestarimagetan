import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCategoriesWithPrices } from "@/lib/common.functions";
import { formatRupiah, formatTanggalWaktu } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jenis Sampah</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="w-16 text-right">Satuan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.categories.map((c) => (
                <TableRow key={c.category_id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {formatRupiah(c.price_per_kg)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">/{c.unit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {data.lastUpdatedAt && (
        <p className="text-xs italic text-muted-foreground">
          Harga terakhir diperbarui oleh Admin pada {formatTanggalWaktu(data.lastUpdatedAt)}.
        </p>
      )}
    </div>
  );
}
