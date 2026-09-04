import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { type LucideIcon } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
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
        {/* Header ala m-banking: bar ramping, identitas kiri, aksi kanan */}
        <header className="relative overflow-hidden rounded-b-3xl bg-gradient-primary px-5 pb-5 pt-5 text-primary-foreground shadow-elegant">
          <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/95 shadow-card">
                <BrandLogo className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-bold leading-tight tracking-tight">{title}</h1>
                {subtitle && (
                  <p className="truncate text-[11px] font-medium text-primary-foreground/80">{subtitle}</p>
                )}
              </div>
            </div>
            {headerRight ?? <LiveClock light />}
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

        {/* Tab bar bawah ala aplikasi perbankan: menempel, rata penuh */}
        <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div
            className="grid px-1.5 pb-1 pt-1.5"
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
                    "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold tracking-tight transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-12 items-center justify-center rounded-full transition-all",
                      active && "bg-primary/10",
                    )}
                  >
                    <Icon className={cn("h-[22px] w-[22px]", active && "stroke-[2.4]")} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

