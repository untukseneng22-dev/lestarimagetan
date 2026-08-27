import { useState } from "react";
import placeholder from "@/assets/produk-placeholder.jpg";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Thumbnail foto produk: selalu persegi dan tajam (sumber 1000px diperkecil
 * lewat `object-cover`, jadi tetap padat di layar retina), otomatis memakai
 * gambar placeholder bila fotonya kosong atau gagal dimuat, dan bisa diperbesar
 * lewat lightbox.
 */
export function ProductThumb({
  src,
  alt,
  size = "md",
  className,
}: {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const [open, setOpen] = useState(false);
  const url = !src || broken ? placeholder : src;
  const isPlaceholder = url === placeholder;

  const dim = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-20 w-20" : "h-14 w-14";

  return (
    <>
      <button
        type="button"
        onClick={() => !isPlaceholder && setOpen(true)}
        aria-label={isPlaceholder ? `${alt} (tanpa foto)` : `Perbesar foto ${alt}`}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-xl border border-border bg-muted",
          dim,
          !isPlaceholder && "cursor-zoom-in transition-transform hover:scale-105",
          className,
        )}
      >
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          width={512}
          height={512}
          onError={() => setBroken(true)}
          className="h-full w-full object-cover [image-rendering:auto]"
        />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-2">
          <img
            src={url}
            alt={alt}
            className="max-h-[75vh] w-full rounded-xl object-contain"
          />
          <p className="pb-1 text-center text-xs text-muted-foreground">{alt}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
