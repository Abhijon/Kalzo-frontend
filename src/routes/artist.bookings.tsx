import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { ArtistBookingsLive } from "@/kalzo/extras/artist/ArtistBookingsLive";
import { kalzoHead } from "@/lib/routeHead";

export const Route = createFileRoute("/artist/bookings")({
  staticData: { sitemap: false },
  head: () => kalzoHead("All bookings", "Your past, current and upcoming Kalzo performances.", true),
  component: ArtistBookingsLayout,
});

/** List at /artist/bookings; detail card at /artist/bookings/:id via Outlet. */
function ArtistBookingsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isDetail = /^\/artist\/bookings\/[^/]+\/?$/.test(path);
  if (isDetail) return <Outlet />;
  return <ArtistBookingsLive />;
}
