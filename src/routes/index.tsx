import { createFileRoute } from "@tanstack/react-router";
import { Kalzo } from "@/kalzo/Kalzo";
import { SiteFooter } from "@/kalzo/extras/SiteFooter";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Kalzo Website Demo – the house of live arts" },
      { name: "description", content: "Find, watch and book live performers and artists near you with Kalzo." },
      { property: "og:title", content: "Kalzo Website Demo – the house of live arts" },
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
