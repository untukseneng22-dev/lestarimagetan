import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Recycle, Loader2, ShieldCheck, Truck, Users, Home } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount } from "@/lib/common.functions";
import { roleHome } from "@/lib/use-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-lg">
            <Recycle className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bank Sampah Digital</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Setor sampah, pantau saldo, jaga lingkungan.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Masuk</CardTitle>
            <CardDescription>Gunakan email dan kata sandi akun Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Masuk
              </Button>
            </form>

            <div className="mt-6">
              <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Akun demo (kata sandi: password123)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const Icon = acc.icon;
                  return (
                    <Button
                      key={acc.email}
                      type="button"
                      variant="outline"
                      className="justify-start"
                      disabled={loading}
                      onClick={() => void doLogin(acc.email, "password123")}
                    >
                      <Icon className="mr-2 h-4 w-4 text-primary" />
                      {acc.label}
                    </Button>
                  );
                })}
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Warga baru mendaftar melalui ketua RT setempat.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
