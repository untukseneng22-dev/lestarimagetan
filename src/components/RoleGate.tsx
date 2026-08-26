import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { roleHome, useMyAccount } from "@/lib/use-account";

export function LoadingScreen({ label = "Memuat..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <BrandLogo className="h-16 w-16" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}

export function RoleGate({ role, children }: { role: string; children: ReactNode }) {
  const { data, isLoading } = useMyAccount();
  const navigate = useNavigate();

  useEffect(() => {
    if (data && data.role !== role) {
      navigate({ to: roleHome(data.role) });
    }
  }, [data, role, navigate]);

  if (isLoading || !data) return <LoadingScreen />;
  if (data.role !== role) return <LoadingScreen label="Mengalihkan..." />;
  return <>{children}</>;
}
