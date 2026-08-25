import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Recycle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveClock } from "./LiveClock";

export type MobileNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export function MobileShell({
  title,
  subtitle,
  items,
  children,
  headerRight,
}: {
  title: string;
  subtitle?: string;
  items: MobileNavItem[];
  children: ReactNode;
  headerRight?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <header className="relative overflow-hidden rounded-b-[2rem] bg-gradient-primary px-5 pb-6 pt-6 text-primary-foreground shadow-elegant">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 shadow-card backdrop-blur">
                <Recycle className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">{title}</h1>
                {subtitle && <p className="text-xs text-primary-foreground/80">{subtitle}</p>}
              </div>
            </div>
            {headerRight ?? <LiveClock light />}
          </div>
        </header>

        <main className="flex-1 px-4 pb-32 pt-5">
          {children}
          <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground/70">
            © 2026 LESTARI MAGETAN
            <br />
            Dikembangkan oleh Tim Kreatif SMAS PGRI Maospati
          </p>
        </main>

        {/* Navigasi bawah mengambang bergaya e-wallet */}
        <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[26rem] -translate-x-1/2">
          <div
            className="grid rounded-3xl border border-border bg-card/95 p-1.5 shadow-elegant backdrop-blur"
            style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
          >
            {items.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium transition-all",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-12 items-center justify-center rounded-full transition-all",
                      active && "bg-gradient-primary text-primary-foreground shadow-glow",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
