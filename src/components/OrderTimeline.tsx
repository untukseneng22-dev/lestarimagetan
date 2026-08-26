import { Check, Circle } from "lucide-react";
import { formatTanggalWaktu, statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const FLOW = ["menunggu", "dibayar", "diproses", "dikirim", "diterima"] as const;

export type OrderEvent = { status: string; note?: string | null; created_at: string };

/** Timeline status pesanan marketplace: Menunggu → Dibayar → Diproses → Dikirim → Diterima. */
export function OrderTimeline({
  events,
  status,
  className,
}: {
  events: OrderEvent[];
  status: string;
  className?: string;
}) {
  const dibatalkan = status === "dibatalkan";
  const last = events.filter((e) => e.status !== "dibatalkan").at(-1);
  const activeIndex = FLOW.indexOf((last?.status ?? "menunggu") as (typeof FLOW)[number]);
  const steps = dibatalkan
    ? [...FLOW.slice(0, Math.max(activeIndex + 1, 1)), "dibatalkan"]
    : [...FLOW];

  return (
    <ol className={cn("space-y-2", className)}>
      {steps.map((step, i) => {
        const event = [...events].reverse().find((e) => e.status === step);
        const done = step === "dibatalkan" ? true : i <= activeIndex && !dibatalkan;
        const isCurrent = step === status;
        return (
          <li key={step} className="flex gap-2.5">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border",
                  step === "dibatalkan"
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
              </span>
              {i < steps.length - 1 && (
                <span className={cn("w-px flex-1", done ? "bg-primary/40" : "bg-border")} />
              )}
            </div>
            <div className="pb-1.5">
              <p className={cn("text-xs", isCurrent ? "font-bold text-foreground" : "font-medium")}>
                {statusLabel(step)}
              </p>
              {event && (
                <p className="text-xs text-muted-foreground">
                  {formatTanggalWaktu(event.created_at)}
                  {event.note ? ` · ${event.note}` : ""}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
