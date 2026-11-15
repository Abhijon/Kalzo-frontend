import { createFileRoute } from "@tanstack/react-router";
import { ArtistBookings } from "@/kalzo/extras/artist/ArtistBookings";
import { kalzoHead } from "@/lib/routeHead";
export const Route = createFileRoute("/artist/bookings")({ staticData: { sitemap: false }, head: () => kalzoHead("All bookings", "Your past, current and upcoming Kalzo performances.", true), component: () => <ArtistBookings /> });
