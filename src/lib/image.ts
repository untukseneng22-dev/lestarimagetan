/**
 * Kompresi gambar di sisi klien memakai canvas: resize ke maksimal `maxDim`
 * piksel (sisi terpanjang) lalu re-encode JPEG. Foto kamera 3-5 MB umumnya
 * turun menjadi 100-300 KB sehingga hemat kuota dan penyimpanan.
 */
export async function compressImage(
  file: File,
  options: { maxDim?: number; quality?: number } = {},
): Promise<File> {
  const { maxDim = 1280, quality = 0.7 } = options;
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  // Gambar kecil tidak perlu diproses ulang bila sudah di bawah 300 KB.
  if (scale === 1 && file.size < 300 * 1024) {
    bitmap.close();
    return file;
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
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "foto";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
