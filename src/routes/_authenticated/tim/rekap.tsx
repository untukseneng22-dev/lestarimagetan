import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getDailyRecap } from "@/lib/tim.functions";
import { formatNumber, formatRupiah, formatTanggalPanjang, formatWaktu, todayISO } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/tim/rekap")({
  head: () => ({ meta: [{ title: "Rekap Harian — Bank Sampah Digital" }] }),
  component: RekapPage,
});

function RekapPage() {
  const recapFn = useServerFn(getDailyRecap);
  const [date, setDate] = useState(todayISO());
  const { data } = useQuery({
    queryKey: ["recap", date],
    queryFn: () => recapFn({ data: { date } }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Rekap Harian</h2>
        <p className="text-xs text-muted-foreground">{formatTanggalPanjang(date)}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tanggal">Tanggal</Label>
        <Input id="tanggal" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {!data ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Card><CardContent className="p-3">
              <p className="text-lg font-bold">{data.totalTransactions}</p>
              <p className="text-[10px] text-muted-foreground">Transaksi</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-lg font-bold">{formatNumber(data.totalWeight)}</p>
              <p className="text-[10px] text-muted-foreground">Kg</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-sm font-bold text-accent">{formatRupiah(data.totalAmount)}</p>
              <p className="text-[10px] text-muted-foreground">Nilai</p>
            </CardContent></Card>
          </div>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Per Kategori</h3>
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {data.perCategory.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">Belum ada setoran pada tanggal ini.</p>
                )}
                {data.perCategory.map((c) => (
                  <div key={c.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span>{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(c.weight)} kg · <span className="font-semibold text-foreground">{formatRupiah(c.amount)}</span>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Transaksi</h3>
            <div className="space-y-2">
              {data.transactions.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{t.residentName}</p>
                      <p className="text-sm font-bold text-primary">{formatRupiah(t.totalAmount)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatWaktu(t.createdAt)} · {formatNumber(t.totalWeight)} kg · oleh {t.recordedBy}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
