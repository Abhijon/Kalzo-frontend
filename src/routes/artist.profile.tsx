import { createFileRoute } from "@tanstack/react-router";
import { ArtistProfileEditor } from "@/kalzo/extras/RealArtistSetup";
import { kalzoHead } from "@/lib/routeHead";
export const Route = createFileRoute("/artist/profile")({ head: () => kalzoHead("My artist profile", "Update your Kalzo artist profile, identity, photographs and reels.", true), staticData: { sitemap: false }, component: ArtistProfileEditor });