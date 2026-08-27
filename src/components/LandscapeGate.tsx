import { useEffect, useState, type ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

/**
 * Memaksa tampilan landscape: pada layar kecil/menengah (HP & tablet)
 * yang sedang portrait, konten diganti overlay "putar perangkat".
 * Jendela desktop sempit tidak terpengaruh.
 */
export function LandscapeGate({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const portrait = window.matchMedia("(orientation: portrait)");
    const smallScreen = window.matchMedia("(max-width: 1024px)");
    const update = () => setBlocked(portrait.matches && smallScreen.matches);
    update();
    portrait.addEventListener("change", update);
    smallScreen.addEventListener("change", update);
    return () => {
      portrait.removeEventListener("change", update);
      smallScreen.removeEventListener("change", update);
    };
  }, []);

  if (!blocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-gradient-hero px-8 text-center">
      <BrandLogo className="h-20 w-20 drop-shadow-lg" />
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-card/90 shadow-elegant">
        <RotateCw className="h-10 w-10 animate-spin text-primary [animation-duration:3s]" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold text-primary-foreground drop-shadow">
          Putar Perangkat Anda
        </h1>
        <p className="text-sm text-primary-foreground/85">
          Panel Admin LESTARI MAGETAN paling nyaman digunakan dalam mode landscape.
        </p>
      </div>
    </div>
  );
}
