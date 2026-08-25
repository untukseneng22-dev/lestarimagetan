import { useEffect, useState } from "react";
import { hariTanggalSekarang, jamSekarang } from "@/lib/format";

export function LiveClock({ light }: { light?: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={light ? "text-primary-foreground" : "text-foreground"}>
      <p className={`text-xs ${light ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        {hariTanggalSekarang(now)}
      </p>
      <p className="text-lg font-semibold tabular-nums leading-tight">{jamSekarang(now)}</p>
    </div>
  );
}
