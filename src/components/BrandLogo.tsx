import logoAsset from "@/assets/logo-lestari.png.asset.json";
import { cn } from "@/lib/utils";

/** Logo resmi LESTARI MAGETAN. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="Logo LESTARI MAGETAN"
      className={cn("object-contain", className)}
      loading="eager"
      decoding="async"
    />
  );
}
