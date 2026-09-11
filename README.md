# LESTARI MAGETAN

Bangun aplikasi Bank Sampah digital dengan UI bahasa Indonesia. Gunakan font Poppins, dominan biru/putih dengan aksen hijau. Buat pengalaman mobile untuk Warga dan Tim Bank Sampah, serta panel Admin desktop dengan sidebar.

Implementasikan kebutuhan inti berikut:
1) Notifikasi WhatsApp otomatis: siapkan service/integrasi terkonfigurasi (gunakan placeholder/mock bila kredensial provider belum tersedia) yang membuat log notifikasi dan titik integrasi untuk pesan akun baru, transaksi setoran, perubahan status tugas penjemputan, pengajuan pencairan saldo, dan pembaruan status aduan. Pesan harus mencantumkan data relevan secara ringkas.
2) Workflow pendaftaran melalui RT: RT mengajukan calon warga berisi nama, alamat, nomor WhatsApp; Admin memiliki antrian persetujuan dengan status Menunggu, Disetujui, Ditolak dan catatan alasan. Hanya pengajuan Disetujui yang dapat dibuatkan akun warga/QR. Tampilkan alasan bila ditolak dan riwayat keputusan.
3) Histori harga sampah: Admin dapat mengelola jenis/kategori dan memperbarui harga. Setiap perubahan membuat record histori dengan harga efektif dan waktu perubahan. Saat transaksi dibuat, sistem mengunci snapshot harga yang berlaku pada tanggal setoran, sehingga transaksi lama tak berubah bila harga diperbarui. Tampilkan histori harga di admin dan detail harga terkunci pada transaksi.
4) Laporan: sediakan filter rentang tanggal dan ekspor PDF serta Excel untuk rekap transaksi, berat sampah per kategori, dan aduan. Implementasikan tombol ekspor yang menghasilkan file yang sesuai, bukan sekadar UI.

Lengkapi fitur produk agar alur dapat didemokan:
- Role Warga: dashboard menampilkan hari/jam, QR Code, saldo, pengumuman dan jadwal; tabungan dengan riwayat dan pengajuan pencairan; daftar harga; aduan dengan foto/status; profil.
- Role Tim: dashboard hari/jam, scanner/input QR atau pencarian warga, kalkulator penimbangan multi-jenis dengan harga terkunci dan saldo warga bertambah, tugas pickup dengan status, rekapan harian.
- Role Admin: dashboard statistik; data warga/tim/RT; harga sampah dan histori; transaksi; tugas pickup; aduan; pengumuman; kas & pencairan; laporan; log notifikasi WhatsApp.
- Buat seed/demo data yang realistis agar semua layar dan ekspor bisa diuji.
- Pastikan desain responsif dan build berjalan tanpa error.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://lestarimagetan.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/de55ffc8-d0ed-422f-be48-65b1483c2c0b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
