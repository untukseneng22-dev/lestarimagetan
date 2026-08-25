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
        <header className="rounded-b-3xl bg-primary px-5 pb-5 pt-6 text-primary-foreground shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
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

        <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

        <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 backdrop-blur">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "text-primary")} />
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
