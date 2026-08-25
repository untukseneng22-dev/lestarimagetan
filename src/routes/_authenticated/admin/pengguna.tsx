import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Pencil, Printer, Trash2, UserPlus } from "lucide-react";
import {
  createUserAccount,
  deleteUserAccount,
  listUsers,
  resetUserPassword,
  updateUserAccount,
} from "@/lib/admin.functions";
import { formatTanggal } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type RoleTab = "warga" | "tim" | "admin";
type UserRow = Awaited<ReturnType<typeof listUsers>>[number];

export const Route = createFileRoute("/_authenticated/admin/pengguna")({
  head: () => ({ meta: [{ title: "Data Pengguna — LESTARI MAGETAN" }] }),
  component: PenggunaPage,
});

const ROLE_LABEL: Record<RoleTab, string> = { warga: "Warga", tim: "Tim", admin: "Admin" };

function PenggunaPage() {
  const listFn = useServerFn(listUsers);
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<RoleTab>("warga");
  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-users", tab],
    queryFn: () => listFn({ data: { role: tab } }),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Data Pengguna</h1>
          <p className="text-sm text-muted-foreground">Kelola akun warga, tim, dan admin — tambah, edit, ganti sandi, hapus.</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "warga" && (
            <Button variant="outline" asChild>
              <Link to="/kartu" search={{ semua: true }}>
                <Printer className="h-4 w-4" /> Cetak Kartu QR
              </Link>
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}><UserPlus className="h-4 w-4" /> Tambah Akun</Button>
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
                <TableHead>Username</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>RT</TableHead>
                <TableHead>Terdaftar</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Memuat…</TableCell></TableRow>
              )}
              {!isLoading && (rows ?? []).length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada {ROLE_LABEL[tab].toLowerCase()}.</TableCell></TableRow>
              )}
              {(rows ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>
                    <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold">{u.username}</code>
                  </TableCell>
                  <TableCell>{u.phone ?? "-"}</TableCell>
                  <TableCell className="max-w-52 truncate">{u.address ?? "-"}</TableCell>
                  <TableCell>{u.rt ?? "-"}</TableCell>
                  <TableCell>{formatTanggal(u.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Edit akun" onClick={() => setEditTarget(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Ganti kata sandi" onClick={() => setPasswordTarget(u)}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Hapus akun"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(u)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateAccountDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultRole={tab === "admin" ? "tim" : tab}
        onDone={refresh}
      />
      <EditAccountDialog target={editTarget} onClose={() => setEditTarget(null)} onDone={refresh} />
      <ResetPasswordDialog target={passwordTarget} onClose={() => setPasswordTarget(null)} />
      <DeleteAccountDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onDone={refresh} />
    </div>
  );
}

function CreateAccountDialog({
  open, onOpenChange, defaultRole, onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultRole: "warga" | "tim";
  onDone: () => Promise<void>;
}) {
  const createFn = useServerFn(createUserAccount);
  const [role, setRole] = useState<"warga" | "tim">(defaultRole);
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
      onOpenChange(false);
      setFullName(""); setPhone(""); setAddress(""); setRt(""); setUsername(""); setPassword("");
      await onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat akun");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button disabled={loading} onClick={() => void submit()}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Buat Akun
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditAccountDialog({
  target, onClose, onDone,
}: {
  target: UserRow | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const updateFn = useServerFn(updateUserAccount);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [rt, setRt] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (target && loadedFor !== target.id) {
    setLoadedFor(target.id);
    setFullName(target.full_name);
    setPhone(target.phone ?? "");
    setAddress(target.address ?? "");
    setRt(target.rt ?? "");
    setUsername(target.username === "-" ? "" : target.username);
  }

  async function submit() {
    if (!target) return;
    setLoading(true);
    try {
      await updateFn({
        data: {
          userId: target.id,
          fullName: fullName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          rt: rt.trim(),
          username: username.trim(),
        },
      });
      toast.success("Akun berhasil diperbarui.");
      onClose();
      await onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui akun");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Akun</DialogTitle>
          <DialogDescription>Perbarui data profil dan username login.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="e-nama">Nama lengkap</Label>
            <Input id="e-nama" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-username">Username login</Label>
            <Input
              id="e-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <p className="text-xs text-muted-foreground">Mengubah username ikut mengubah kredensial login pengguna.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-wa">Nomor WhatsApp</Label>
            <Input id="e-wa" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-alamat">Alamat</Label>
            <Input id="e-alamat" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-rt">RT</Label>
            <Input id="e-rt" value={rt} onChange={(e) => setRt(e.target.value)} placeholder="Contoh: 04" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled={loading} onClick={() => void submit()}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ target, onClose }: { target: UserRow | null; onClose: () => void }) {
  const resetFn = useServerFn(resetUserPassword);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!target) return;
    setLoading(true);
    try {
      await resetFn({ data: { userId: target.id, password } });
      toast.success(`Kata sandi ${target.full_name} direset.${target.phone ? " Kredensial baru dikirim via WhatsApp." : ""}`);
      setPassword("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengganti kata sandi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ganti Kata Sandi</DialogTitle>
          <DialogDescription>
            Atur kata sandi baru untuk <span className="font-semibold">{target?.full_name}</span>
            {target ? ` (@${target.username})` : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="p-sandi">Kata sandi baru</Label>
          <Input
            id="p-sandi"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
          />
          <p className="text-xs text-muted-foreground">Kata sandi baru dikirim ke WhatsApp pengguna bila nomornya tersedia.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled={loading || password.length < 6} onClick={() => void submit()}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Sandi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({
  target, onClose, onDone,
}: {
  target: UserRow | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const deleteFn = useServerFn(deleteUserAccount);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    if (!target) return;
    setLoading(true);
    try {
      await deleteFn({ data: { userId: target.id } });
      toast.success(`Akun ${target.full_name} dihapus.`);
      onClose();
      await onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus akun");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={target !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus akun {target?.full_name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini permanen: profil, peran, dan akses login (@{target?.username}) akan dihapus.
            Akun dengan riwayat transaksi/aduan tidak dapat dihapus demi keutuhan laporan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
            onClick={(e) => { e.preventDefault(); void confirm(); }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Ya, Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
