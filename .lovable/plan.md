# Rencana: Konfirmasi Keluar, QR Cetak & Scan, Jadwal Penarikan, Tabel Harga, Kompresi Foto + Peningkatan

## 1. Konfirmasi sebelum Keluar
- `LogoutButton` dibungkus `AlertDialog` (komponen sudah tersedia): judul "Keluar dari akun?", tombol **Tidak** (batal) dan **Ya, Keluar**.
- Berlaku otomatis di semua peran (warga, tim, admin) karena semua memakai komponen yang sama.

## 2. QR Warga Bisa Dicetak & Dipindai Petugas
Menjawab kasus: warga tidak di rumah, sampah sudah disiapkan, petugas scan QR yang ditempel di tembok.
- **Cetak QR (warga)**: tombol "Cetak QR" di halaman Profil warga membuka kartu anggota siap print (nama, RT/RW, QR besar, instruksi penempelan) lewat `window.print()` + CSS `@media print` (utilitas `.print-only` / `.no-print` di `styles.css`, konten aplikasi disembunyikan saat mencetak).
- **Scan QR (tim)**: tombol "Scan QR" di halaman Setor Sampah membuka pemindai kamera (paket baru `html5-qrcode`). Hasil scan berisi ID warga langsung memilih warga tersebut — tanpa perlu mengetik.
- **Cetak kartu massal (admin)** — ide tambahan: tombol "Cetak QR Semua Warga" di halaman Pengguna, menghasilkan lembar berisi grid kartu QR seluruh warga untuk diprint dan dibagikan/ditempel di rumah.

## 3. Jadwal Penarikan Dikelola Admin
- **Migrasi database**: tabel baru `app_settings` (key, value JSONB) lengkap dengan GRANT + RLS (semua pengguna login bisa membaca; hanya admin yang bisa mengubah). Data awal:
  - `pickup_schedule`: hari penjemputan rutin (misal 1 minggu sekali: Jumat), jam, status aktif.
  - `dropoff_info`: alamat kantor bank sampah + jam layanan untuk warga yang mengantar sendiri.
- **Halaman admin baru** `/admin/jadwal` ("Jadwal" di sidebar): centang hari penjemputan, jam operasional, tombol aktif/nonaktif, dan formulir info antar-mandiri. Saat disimpan, sistem mencatat notifikasi WhatsApp (log mock) ke seluruh warga tentang jadwal baru.
- **Dasbor warga**: tulisan jadwal yang saat ini hardcoded "Selasa & Jumat" diganti membaca pengaturan dari admin, plus kartu info "Antar sendiri ke kantor" (alamat & jam). Dasbor tim juga menampilkan jadwal rutin.

## 4. Harga Sampah dalam Tabel + Catatan Miring
- **Halaman warga Harga**: grid kartu diganti menjadi tabel (Jenis Sampah | Satuan | Harga | Berlaku Sejak). Di bawah tabel ditambah tulisan miring: *"Harga terakhir diubah oleh Admin pada {tanggal}"*.
- **Halaman admin Harga**: tabel yang sudah ada ditambah catatan miring serupa di bawahnya.
- `getCategoriesWithPrices` diperbarui untuk mengembalikan juga tanggal perubahan harga terakhir (dari `price_history`).

## 5. Kompresi Foto Otomatis
- Util baru `src/lib/image.ts`: `compressImage()` memakai canvas — resize maksimal 1280px dan re-encode JPEG kualitas ±70% (foto 3–5 MB turun menjadi ±100–300 KB).
- Dipasang di dua titik upload: **foto profil** (`AvatarUpload`) dan **foto aduan** (halaman Aduan warga). Batas 2MB dihapus/dinaikkan karena kompresi terjadi sebelum upload.

## 6. Ide Tambahan dari Saya
- **Warga Teladan Bulan Ini**: papan peringkat 5 warga dengan setoran (kg) terbanyak bulan ini, tampil di dasbor warga & dasbor admin — memotivasi warga lewat gamifikasi.
- **Dampak & grafik tabungan**: di halaman Tabungan warga, tambah kartu "Total sampah terpilah: X kg" dan grafik batang setoran 6 bulan terakhir (recharts sudah terpasang).

## Detail Teknis
- **Migrasi**: 1 migrasi — `CREATE TABLE public.app_settings` + GRANT + RLS + 2 baris seed. Perlu persetujuan Anda saat dijalankan.
- **Paket baru**: `html5-qrcode` (pemindai kamera QR, murni browser).
- **Server functions**: `getAppSettings` (semua peran) dan `updateAppSettings` (admin, sekaligus menulis log notifikasi WA) di `common.functions.ts` / `admin.functions.ts`; leaderboard & grafik memakai query agregasi `transactions`/`transaction_items` yang sudah ada — tanpa perubahan skema tambahan.
- **File utama yang diubah**: `LogoutButton.tsx`, `warga/profil.tsx`, `tim/setor.tsx`, `admin/route.tsx`, `admin/jadwal.tsx` (baru), `admin/pengguna.tsx`, `warga/index.tsx`, `warga/harga.tsx`, `admin/harga.tsx`, `warga/tabungan.tsx`, `AvatarUpload.tsx`, `warga/aduan.tsx`, `styles.css` (print CSS), `common.functions.ts`, `admin.functions.ts`, `warga.functions.ts`, `lib/image.ts` (baru).
- **Verifikasi**: uji Playwright untuk konfirmasi keluar, cetak QR (tampilan print), scan/penjemputan warga, ubah jadwal oleh admin lalu cek tampil di warga, kompresi foto, dan build/typecheck harus bersih.
