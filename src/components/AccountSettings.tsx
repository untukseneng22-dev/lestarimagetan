import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { updateMyContact } from "@/lib/common.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const contactSchema = z.object({
  phone: z.string().trim().regex(/^(\+?62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid (contoh 0812xxxx)"),
  address: z.string().trim().min(5, "Alamat minimal 5 karakter").max(255),
});

export function AccountSettings({
  phone,
  address,
  showContact = true,
}: {
  phone: string | null;
  address: string | null;
  showContact?: boolean;
}) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateMyContact);
  const [p, setP] = useState(phone ?? "");
  const [a, setA] = useState(address ?? "");
  const [savingC, setSavingC] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingP, setSavingP] = useState(false);

  async function saveContact() {
    const r = contactSchema.safeParse({ phone: p, address: a });
    if (!r.success) { toast.error(r.error.issues[0]?.message ?? "Data tidak valid"); return; }
    setSavingC(true);
    try {
      await updateFn({ data: r.data });
      await qc.invalidateQueries({ queryKey: ["my-account"] });
      toast.success("Data kontak diperbarui");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSavingC(false);
    }
  }

  async function savePassword() {
    if (pw.length < 6) { toast.error("Kata sandi minimal 6 karakter"); return; }
    if (pw !== pw2) { toast.error("Konfirmasi kata sandi tidak sama"); return; }
    setSavingP(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSavingP(false);
    if (error) {
      toast.error(
        /pwned|leaked|weak/i.test(error.message)
          ? "Kata sandi terlalu umum/pernah bocor, pilih yang lain"
          : error.message,
      );
      return;
    }
    setPw("");
    setPw2("");
    toast.success("Kata sandi berhasil diganti");
  }

  return (
    <>
      {showContact && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <Pencil className="h-4 w-4 text-primary" /> Ubah Kontak
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="acc-phone">No. WhatsApp</Label>
              <Input id="acc-phone" inputMode="tel" value={p} maxLength={16} onChange={(e) => setP(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-addr">Alamat</Label>
              <Input id="acc-addr" value={a} maxLength={255} onChange={(e) => setA(e.target.value)} />
            </div>
            <Button className="w-full" onClick={saveContact} disabled={savingC}>
              {savingC && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Simpan Kontak
            </Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold">
            <KeyRound className="h-4 w-4 text-primary" /> Ganti Kata Sandi
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="acc-pw">Kata sandi baru</Label>
            <Input id="acc-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-pw2">Ulangi kata sandi</Label>
            <Input id="acc-pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <Button variant="outline" className="w-full" onClick={savePassword} disabled={savingP}>
            {savingP && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Ganti Kata Sandi
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
