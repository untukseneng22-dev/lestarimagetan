# Paksa Mode Landscape untuk Panel Admin

## Tujuan
Panel Admin selalu tampil landscape. Jika dibuka dalam posisi portrait (HP/tablet), muncul overlay layar penuh yang meminta pengguna memutar perangkat. Tim Bank Sampah dan Warga tidak berubah — tetap bebas dibuka di perangkat/orientasi apa pun.

## Perubahan

### 1. Komponen baru: `src/components/LandscapeGate.tsx`
- Memakai `window.matchMedia("(orientation: portrait)")` (dengan listener `change`) untuk mendeteksi orientasi secara real-time.
- Overlay hanya aktif pada layar kecil/menengah (`max-width: 1024px`, yaitu HP & tablet) — jendela desktop sempit tidak terganggu.
- Saat portrait terdeteksi: render overlay layar penuh (z-index tinggi) berisi:
  - Logo LESTARI MAGETAN (BrandLogo)
  - Ikon `Smartphone`/`RotateCw` (lucide) dengan animasi rotasi halus
  - Teks: "Putar Perangkat Anda" + subteks "Panel Admin LESTARI MAGETAN paling nyaman digunakan dalam mode landscape."
- Saat landscape: konten admin tampil normal tanpa overlay.
- Aman SSR: state awal tidak membaca `window` (overlay dirender setelah mount via `useEffect`/`useState`).

### 2. Pasang di layout Admin: `src/routes/_authenticated/admin/route.tsx`
- Bungkus seluruh isi layout admin (sidebar + main) dengan `<LandscapeGate>`, di dalam `RoleGate`.
- Tidak ada perubahan pada menu, rute, atau halaman admin lainnya.

### 3. Tidak diubah
- Layout Tim (`_authenticated/tim/route.tsx`) dan Warga (`_authenticated/warga/route.tsx`) — tetap mobile-first bebas orientasi.
- Halaman login dan halaman publik lainnya.

## Verifikasi
- Build/typecheck bersih (`/tmp/observability/build-errors.log`).
- Uji via Playwright: viewport portrait (mis. 390x844) di `/admin` menampilkan overlay; viewport landscape (mis. 844x390) menampilkan panel admin normal; `/warga` dan `/tim` tetap normal di kedua orientasi.
