import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function LogoutButton({ variant = "outline" }: { variant?: "outline" | "ghost" | "destructive" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return (
    <Button
      variant={variant}
      className="w-full"
      onClick={async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
        toast.success("Anda telah keluar");
        navigate({ to: "/auth", replace: true });
      }}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Keluar
    </Button>
  );
}
