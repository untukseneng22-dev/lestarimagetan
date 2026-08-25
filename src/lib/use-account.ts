import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccount } from "./common.functions";

export function roleHome(role: string | null | undefined): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "tim":
      return "/tim";
    default:
      return "/warga";
  }
}

export function useMyAccount() {
  const fn = useServerFn(getMyAccount);
  return useQuery({
    queryKey: ["my-account"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}
