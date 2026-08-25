import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Printer, UserPlus } from "lucide-react";
import { createUserAccount, listUsers } from "@/lib/admin.functions";
import { formatTanggal } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type RoleTab = "warga" | "tim" | "admin";

export const Route = createFileRoute("/_authenticated/admin/pengguna")({
  head: () => ({ meta: [{ title: "Data Pengguna — LESTARI MAGETAN" }] }),
  component: PenggunaPage,
});

const ROLE_LABEL: Record<RoleTab, string> = { warga: "Warga", tim: "Tim", admin: "Admin" };

function PenggunaPage() {
  const listFn = useServerFn(listUsers);
  const createFn = useServerFn(createUserAccount);
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<RoleTab>("warga");
  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-users", tab],
    queryFn: () => listFn({ data: { role: tab } }),
  });

  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"warga" | "tim">("warga");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [rt, setRt] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await createFn({
        data: { role, fullName: fullName.trim(), phone: phone.trim(), address: address.trim(), rt: rt.trim() || undefined, username: username.trim(), password },
      });
      toast.success(`Akun ${ROLE_LABEL[role]} dibuat. ${role === "warga" ? "Kredensial dikirim via WhatsApp." : ""}`);
      setOpen(false);
      setFullName(""); setPhone(""); setAddress(""); setRt(""); setUsername(""); setPassword("");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat akun");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Data Pengguna</h1>
          <p className="text-sm text-muted-foreground">Kelola akun warga dan tim bank sampah.</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "warga" && (
            <Button variant="outline" asChild>
              <Link to="/kartu" search={{ semua: true }}>
                <Printer className="h-4 w-4" /> Cetak Kartu QR
              </Link>
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="h-4 w-4" /> Tambah Akun</Button>
            </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Akun Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Peran</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "warga" | "tim")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warga">Warga</SelectItem>
                    <SelectItem value="tim">Tim Bank Sampah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nama">Nama lengkap</Label>
                <Input id="nama" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama sesuai KTP" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wa">Nomor WhatsApp</Label>
                <Input id="wa" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="alamat">Alamat</Label>
                <Input id="alamat" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat domisili" />
              </div>
              {role === "warga" && (
                <div className="space-y-1.5">
                  <Label htmlFor="rt">RT (opsional)</Label>
                  <Input id="rt" value={rt} onChange={(e) => setRt(e.target.value)} placeholder="Contoh: 04" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="username">Username login</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="mis. budisantoso"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <p className="text-xs text-muted-foreground">Huruf kecil tanpa spasi — dipakai untuk masuk ke aplikasi.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sandi">Kata sandi</Label>
                <Input id="sandi" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button disabled={loading} onClick={() => void submit()}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Buat Akun
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as RoleTab)}>
        <TabsList>
          <TabsTrigger value="warga">Warga</TabsTrigger>
          <TabsTrigger value="tim">Tim</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>RT</TableHead>
                <TableHead>Terdaftar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Memuat…</TableCell></TableRow>
              )}
              {!isLoading && (rows ?? []).length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Belum ada {ROLE_LABEL[tab].toLowerCase()}.</TableCell></TableRow>
              )}
              {(rows ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>{u.phone ?? "-"}</TableCell>
                  <TableCell className="max-w-52 truncate">{u.address ?? "-"}</TableCell>
                  <TableCell>{u.rt ?? "-"}</TableCell>
                  <TableCell>{formatTanggal(u.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
