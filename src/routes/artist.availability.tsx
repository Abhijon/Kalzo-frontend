import { createFileRoute } from "@tanstack/react-router";
import { ArtistAvailability } from "@/kalzo/extras/artist/ArtistAvailability";
import { kalzoHead } from "@/lib/routeHead";

export const Route = createFileRoute("/artist/availability")({
  staticData: { sitemap: false },
  head: () =>
    kalzoHead("Availability", "Set the days and time slots patrons can book.", true),
  component: () => <ArtistAvailability />,
});
