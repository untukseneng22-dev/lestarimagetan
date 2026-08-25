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
    <div className="min-h-screen bg-background">
      {/* Hero bergaya e-wallet */}
      <div className="relative overflow-hidden bg-gradient-hero px-6 pb-24 pt-14 text-primary-foreground">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -left-10 top-32 h-32 w-32 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-8 top-40 h-16 w-16 rounded-full bg-accent/40" />
        <div className="relative mx-auto flex max-w-md flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white/15 shadow-elegant backdrop-blur">
            <Recycle className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">LESTARI MAGETAN</h1>
          <p className="mt-2 flex max-w-xs items-start justify-center gap-1.5 text-sm leading-relaxed text-primary-foreground/85">
            <Leaf className="mt-0.5 h-4 w-4 shrink-0" />
            Layanan Elektronik Sampah, Tabungan, dan Rawat Lingkungan Magetan
          </p>
        </div>
      </div>

      {/* Kartu login mengambang */}
      <div className="relative mx-auto -mt-16 w-full max-w-md px-4 pb-10">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant">
          <h2 className="text-lg font-bold">Masuk ke Akun</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Gunakan username dan kata sandi akun Anda.</p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void doLogin(username, password);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                placeholder="mis. budisantoso"
                className="h-12 rounded-xl bg-muted/40"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-12 rounded-xl bg-muted/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="h-12 w-full rounded-xl bg-gradient-primary text-base font-semibold shadow-elegant" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Masuk
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Belum punya akun? Hubungi pengurus Bank Sampah untuk didaftarkan.
        </p>
        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground/80">
          © 2026 LESTARI MAGETAN
          <br />
          Dikembangkan oleh Tim Kreatif SMAS PGRI Maospati
        </p>
      </div>
    </div>
  );
}
