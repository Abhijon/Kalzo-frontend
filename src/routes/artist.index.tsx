import { createFileRoute } from "@tanstack/react-router";
import { ArtistBookings } from "@/kalzo/extras/artist/ArtistBookings";
import { kalzoHead } from "@/lib/routeHead";
export const Route = createFileRoute("/artist/")({ head: () => kalzoHead("Booking requests", "Your Kalzo booking invitations and active performance steps.", true), staticData: { sitemap: false }, component: () => <ArtistBookings requestsOnly /> });
