import { statusLabel, statusTone, type BadgeTone } from "@/lib/format";
import { cn } from "@/lib/utils";

const toneClasses: Record<BadgeTone, string> = {
  green: "bg-accent/15 text-accent",
  amber: "bg-chart-5/15 text-chart-5",
  blue: "bg-primary/10 text-primary",
  red: "bg-destructive/10 text-destructive",
  gray: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[statusTone(status)],
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
