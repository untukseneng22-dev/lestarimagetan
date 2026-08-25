import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Recycle, Loader2, Leaf } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount } from "@/lib/common.functions";
import { roleHome } from "@/lib/use-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — LESTARI MAGETAN" },
      {
        name: "description",
        content:
          "Masuk ke LESTARI MAGETAN — Layanan Elektronik Sampah, Tabungan, dan Rawat Lingkungan Magetan.",
      },
      { property: "og:title", content: "Masuk — LESTARI MAGETAN" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AuthPage,
});

function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@banksampah.id`;
}

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function doLogin(loginUsername: string, loginPassword: string) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(loginUsername),
        password: loginPassword,
      });
      if (error) throw error;
      const account = await getMyAccount();
      toast.success(`Selamat datang, ${account.fullName}!`);
      navigate({ to: roleHome(account.role) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login gagal. Periksa username dan kata sandi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Hero ringkas */}
      <div className="relative flex shrink-0 flex-col items-center justify-center overflow-hidden bg-gradient-hero px-6 pb-8 pt-6 text-primary-foreground">
        <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -left-8 top-20 h-24 w-24 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-6 top-28 h-12 w-12 rounded-full bg-accent/40" />
        <div className="relative flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-elegant backdrop-blur">
            <Recycle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">LESTARI MAGETAN</h1>
          <p className="mt-1 flex max-w-[16rem] items-start justify-center gap-1 text-xs leading-snug text-primary-foreground/85">
            <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Layanan Elektronik Sampah, Tabungan, dan Rawat Lingkungan Magetan
          </p>
        </div>
      </div>

      {/* Kartu login */}
      <div className="relative mx-auto -mt-5 w-full max-w-md flex-1 px-4">
        <div className="h-full rounded-t-3xl border border-border bg-card p-5 shadow-elegant">
          <h2 className="text-base font-bold">Masuk ke Akun</h2>
          <p className="text-xs text-muted-foreground">Gunakan username dan kata sandi akun Anda.</p>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void doLogin(username, password);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs">Username</Label>
              <Input
                id="username"
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                placeholder="mis. budisantoso"
                className="h-11 rounded-xl bg-muted/40 text-sm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Kata Sandi</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11 rounded-xl bg-muted/40 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl bg-gradient-primary text-sm font-semibold shadow-elegant" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Masuk
            </Button>
          </form>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Belum punya akun? Hubungi pengurus Bank Sampah untuk didaftarkan.
          </p>
        </div>
      </div>

      <p className="shrink-0 pb-3 pt-2 text-center text-[10px] leading-tight text-muted-foreground/80">
        © 2026 LESTARI MAGETAN — Dikembangkan oleh Tim Kreatif SMAS PGRI Maospati
      </p>
    </div>
  );
}
