# Marketplace Sembako untuk Warga

Mengubah menu "Harga" warga menjadi "Marketplace", memindahkan daftar harga sampah ke dashboard, dan menambah toko sembako yang bisa dibayar memakai saldo tabungan.

## Ide ini masuk akal
Menukar saldo tabungan dengan sembako membuat saldo terasa nyata dan mengurangi antrean pencairan tunai. Ongkir flat lokal juga wajar. Catatan: stok dan modal barang harus dikelola Admin dengan disiplin, jadi alur pesanan dibuat sederhana (konfirmasi manual Admin, bukan otomatis).

## Yang berubah untuk Warga

1. **Dashboard** — kartu baru "Harga Sampah Hari Ini" berisi tabel ringkas semua kategori + harga, dengan catatan miring kapan terakhir diperbarui Admin. Ada tautan ke tabel harga lengkap.
2. **Menu "Harga" → "Marketplace"** (ikon keranjang):
   - Katalog produk sembako: foto, nama, satuan, harga, sisa stok.
   - Pencarian dan kategori sederhana (mis. Beras, Minyak, Gula, Lainnya).
   - Keranjang belanja + ringkasan: subtotal, ongkir, total.
   - Pilihan pengiriman: **Diantar** (kena ongkir flat) atau **Ambil di kantor** (gratis).
   - Pembayaran: potong saldo tabungan; bila saldo kurang, sisanya ditandai **bayar tunai saat terima** dan ditampilkan jelas sebelum konfirmasi.
   - Halaman "Pesanan Saya": status pesanan, rincian item, harga terkunci saat pesan.
3. **Halaman harga sampah** tetap ada sebagai halaman detail (tautan dari dashboard), tidak lagi jadi tab utama.

## Yang berubah untuk Admin

Menu baru **Marketplace** (di grup Data Master / Layanan Warga):
- **Produk**: tambah/edit/hapus produk, atur harga, stok, satuan, foto (otomatis dikompres), aktif/nonaktif.
- **Pesanan**: daftar pesanan warga dengan status **menunggu → dikonfirmasi → diproses → selesai**, serta **dibatalkan**. Saat dikonfirmasi, saldo dipotong dan stok berkurang; saat dibatalkan, saldo dikembalikan.
- **Pengaturan ongkir**: tarif flat yang bisa diubah Admin.
- Notifikasi WhatsApp (mock) terkirim saat pesanan dibuat dan saat status berubah.

## Detail teknis

Tabel baru (public, dengan GRANT + RLS):
- `market_products` — nama, kategori, satuan, harga, stok, foto_path, is_active. Warga: SELECT produk aktif; Admin: ALL.
- `market_orders` — resident_id, metode (antar/ambil), alamat, ongkir, total_barang, total_bayar, dibayar_saldo, bayar_tunai, status, catatan admin. Warga: SELECT/INSERT milik sendiri; Admin: SELECT/UPDATE semua.
- `market_order_items` — order_id, product_id, nama & harga terkunci, qty, subtotal.
- Bucket privat `produk` untuk foto produk (signed URL, kompresi via `src/lib/image.ts`).
- Ongkir flat disimpan di `app_settings` (key `market_shipping_fee`).

Saldo: `getBalance` diperluas — saldo = setoran − pencairan disetujui − **pesanan marketplace yang dikonfirmasi/selesai (porsi yang dibayar saldo)**. Pesanan dibatalkan tidak dihitung.

Server functions baru di `src/lib/market.functions.ts` (katalog, buat pesanan, pesanan saya) dan penambahan di `admin.functions.ts` (CRUD produk, kelola pesanan), semuanya lewat `requireSupabaseAuth`.

Validasi saat pesan: stok cukup, produk aktif, qty > 0, harga & ongkir dihitung ulang di server (tidak percaya input klien).

Data contoh: ±10 produk sembako (beras, minyak goreng, gula, telur, mi instan, kopi, teh, sabun, kecap, tepung) agar layar langsung bisa didemokan.
