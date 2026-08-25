import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton generik saat berpindah halaman agar transisi terasa cepat */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 pt-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40 rounded-lg" />
        <Skeleton className="h-4 w-56 rounded-lg" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  );
}
