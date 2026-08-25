import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateMyProfile } from "@/lib/common.functions";
import { compressImage } from "@/lib/image";
import { cn } from "@/lib/utils";

export function AvatarUpload({
  userId,
  name,
  avatarUrl,
  tone = "card",
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
  tone?: "card" | "gradient";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const updateFn = useServerFn(updateMyProfile);
  const queryClient = useQueryClient();

  async function onFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 10MB");
      return;
    }
    setUploading(true);
    try {
      // Kompres otomatis agar ringan (maks 512px, JPEG).
      const compressed = await compressImage(file, { maxDim: 512, quality: 0.8 });
      const path = `${userId}/avatar.jpg`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
      await updateFn({ data: { avatarUrl: path } });
      await queryClient.invalidateQueries({ queryKey: ["my-account"] });
      toast.success("Foto profil diperbarui");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah foto");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "relative block h-20 w-20 overflow-hidden rounded-3xl text-2xl font-bold ring-2 transition-transform active:scale-95",
          tone === "gradient"
            ? "bg-white/20 text-white ring-white/40 backdrop-blur"
            : "bg-primary/10 text-primary ring-border",
        )}
        aria-label="Ganti foto profil"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/45 py-1 text-[10px] font-medium text-white">
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
          {uploading ? "Mengunggah" : "Ubah"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
      />
    </div>
  );
}
