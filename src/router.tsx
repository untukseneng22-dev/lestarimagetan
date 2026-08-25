import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PageSkeleton } from "./components/PageSkeleton";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Prefetch rute saat pengguna menyentuh/mengarahkan ke tautan
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    // Skeleton singkat agar perpindahan halaman terasa responsif
    defaultPendingMs: 150,
    defaultPendingMinMs: 250,
    defaultPendingComponent: PageSkeleton,
  });

  return router;
};
