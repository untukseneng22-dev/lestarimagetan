import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function LogoutButton({ variant = "outline" }: { variant?: "outline" | "ghost" | "destructive" }) {
  const navigate = useNavigate();
  return (
    <Button
      variant={variant}
      className="w-full"
      onClick={async () => {
        await supabase.auth.signOut();
        toast.success("Anda telah keluar");
        navigate({ to: "/auth" });
      }}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Keluar
    </Button>
  );
}
