import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Recycle, Loader2, ShieldCheck, Truck, Users, Home, Leaf, Sparkles } from "lucide-react";
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
      { title: "Masuk — Bank Sampah Digital" },
      { name: "description", content: "Masuk ke akun Bank Sampah Digital Anda." },
      { property: "og:title", content: "Masuk — Bank Sampah Digital" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AuthPage,
});

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@banksampah.id", icon: ShieldCheck },
  { label: "Tim Lapangan", email: "tim@banksampah.id", icon: Truck },
  { label: "RT 05", email: "rt@banksampah.id", icon: Home },
  { label: "Warga (Budi)", email: "budi@banksampah.id", icon: Users },
];

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function doLogin(loginEmail: string, loginPassword: string) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      const account = await getMyAccount();
      toast.success(`Selamat datang, ${account.fullName}!`);
      navigate({ to: roleHome(account.role) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login gagal. Periksa email dan kata sandi.");
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
          <h1 className="text-3xl font-extrabold tracking-tight">Bank Sampah Digital</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-primary-foreground/85">
            <Leaf className="h-4 w-4" /> Setor sampah, pantau saldo, jaga lingkungan.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium backdrop-blur">
            <Sparkles className="h-3 w-3" /> RT 05 · Melayani setiap Selasa & Jumat
          </div>
        </div>
      </div>

      {/* Kartu login mengambang */}
      <div className="relative mx-auto -mt-16 w-full max-w-md px-4 pb-10">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant">
          <h2 className="text-lg font-bold">Masuk ke Akun</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Gunakan email dan kata sandi akun Anda.</p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void doLogin(email, password);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="nama@banksampah.id"
                className="h-12 rounded-xl bg-muted/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input
                id="password"
                type="password"
                required
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

        <div className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-card">
          <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Akun demo · kata sandi: password123
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.email}
                  type="button"
                  disabled={loading}
                  onClick={() => void doLogin(acc.email, "password123")}
                  className="flex items-center gap-2.5 rounded-2xl border border-border bg-muted/30 px-3 py-2.5 text-left text-sm font-medium transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-card disabled:opacity-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  {acc.label}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Warga baru mendaftar melalui ketua RT setempat.
          </p>
        </div>
      </div>
    </div>
  );
}
