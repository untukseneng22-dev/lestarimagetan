/**
 * Kompresi gambar di sisi klien memakai canvas: resize ke maksimal `maxDim`
 * piksel (sisi terpanjang) lalu re-encode JPEG. Foto kamera 3-5 MB umumnya
 * turun menjadi 100-300 KB sehingga hemat kuota dan penyimpanan.
 *
 * Hasil kompresi di-cache per file (nama+ukuran+waktu ubah+opsi) sehingga
 * memilih ulang foto yang sama — atau membuka kembali dialog edit — tidak
 * memproses ulang canvas.
 */
const compressCache = new Map<string, File>();
const CACHE_LIMIT = 30;

function cacheKey(file: File, maxDim: number, quality: number) {
  return `${file.name}|${file.size}|${file.lastModified}|${maxDim}|${quality}`;
}

export async function compressImage(
  file: File,
  options: { maxDim?: number; quality?: number } = {},
): Promise<File> {
  const { maxDim = 1280, quality = 0.7 } = options;
  if (!file.type.startsWith("image/")) return file;

  const key = cacheKey(file, maxDim, quality);
  const cached = compressCache.get(key);
  if (cached) return cached;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  // Gambar kecil tidak perlu diproses ulang bila sudah di bawah 300 KB.
  if (scale === 1 && file.size < 300 * 1024) {
    bitmap.close();
    return rememberCompressed(key, file);
  }

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // Interpolasi kualitas tinggi supaya thumbnail tetap tajam setelah diperkecil.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "foto";
  return rememberCompressed(key, new File([blob], `${baseName}.jpg`, { type: "image/jpeg" }));
}

function rememberCompressed(key: string, file: File) {
  if (compressCache.size >= CACHE_LIMIT) {
    const oldest = compressCache.keys().next().value;
    if (oldest) compressCache.delete(oldest);
  }
  compressCache.set(key, file);
  return file;
}
