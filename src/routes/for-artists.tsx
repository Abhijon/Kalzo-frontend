import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { api } from "@/lib/api";
import { accountData } from "@/lib/kalzo.functions";
import { accountDestination } from "@/kalzo/extras/accountDestination";
import "@/kalzo/extras/account.css";
import { ArtistWelcome } from "@/kalzo/Kalzo";
const T = "Become a Kalzo artist";
const D = "Create your Kalzo artist profile: rate, cities, reels, face verification and wallet for your bookings.";
export const Route = createFileRoute("/for-artists")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: T + " – Kalzo" },
      { name: "description", content: D },
      { property: "og:title", content: T + " – Kalzo" },
      { property: "og:description", content: D },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForArtists,
});
function ForArtists() {
  const navigate = useNavigate(), read = useServerFn(accountData);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    const resolve = async () => {
      const { data } = await api.auth.getUser();
      if (data?.user) {
        const account = await read();
        if (active && accountDestination(!!account.artist, data.user.user_metadata?.["account_audience"]) === "/artist") {
          await navigate({ to: "/artist", replace: true }); return;
        }
      }
      if (active) setChecking(false);
    };
    void resolve().catch(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [navigate, read]);
  return (
    <main className="kl-account">
      <div className="kl-inner">
        <nav className="kl-nav"><Link to="/">Kalzo</Link><Link to="/faqs">FAQs</Link></nav>
        {checking ? <p>Opening your Kalzo…</p> : <ArtistWelcome />}
      </div>
    </main>
  );
}
