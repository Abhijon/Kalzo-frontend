import { createFileRoute } from "@tanstack/react-router";
import { Kalzo } from "@/kalzo/Kalzo";
import { SiteFooter } from "@/kalzo/extras/SiteFooter";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  validateSearch: (s: Record<string, unknown>): { artist?: string; screen?: string } => ({
    artist: typeof s["artist"] === "string" ? s["artist"] : undefined,
    screen: typeof s["screen"] === "string" ? s["screen"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Kalzo – the house of live arts" },
      { name: "description", content: "Find, watch and book live performers and artists near you with Kalzo." },
      { property: "og:title", content: "Kalzo – the house of live arts" },
      { property: "og:description", content: "Find, watch and book live performers and artists near you with Kalzo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <Kalzo />
      <SiteFooter />
    </>
  );
}
