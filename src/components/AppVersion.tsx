export function AppVersion({ light = false }: { light?: boolean }) {
  return (
    <p
      className={
        "text-center text-[11px] " + (light ? "text-primary-foreground/70" : "text-muted-foreground")
      }
    >
      LESTARI MAGETAN · Versi 1.0.0
    </p>
  );
}
