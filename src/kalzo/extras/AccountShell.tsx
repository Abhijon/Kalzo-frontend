import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { PatronGate } from "./PatronGate";
import type { AccountAudience } from "./signupRules";
import "./account.css";
import "./artist/panels.css";
import paper from "@/assets/vintage-panel-paper.png.asset.json";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { KalzoAtmosphere } from "./artist/KalzoAtmosphere";
import { accountDestination } from "./accountDestination";
export function AccountShell({
  children,
  title,
  audience = "patron",
}: {
  children: ReactNode;
  title: string;
  audience?: AccountAudience;
}) {
  const navigate = useNavigate();
  const [signed, setSigned] = useState<boolean | null>(null);
  const [logoutError, setLogoutError] = useState("");
  const [kind, setKind] = useState<"artist" | "patron" | "admin" | null>(null);
  const [paperLoaded, setPaperLoaded] = useState(false);
  const logout = async () => {
    const { error } = await api.auth.signOut();
    if (error) { setLogoutError(error.message); return; }
    await navigate({ to: "/goodbye" });
  };
  useEffect(() => {
    api.auth.getUser().then(async ({ data }) => {
      setSigned(!!data?.user);
      if (!data?.user) return;
      // Use role directly from /me response — no extra table lookups needed
      const role = (data.user.role as string | undefined)?.toUpperCase();
      if (role === "ADMIN") { setKind("admin"); return; }
      const isArtist = role === "ARTIST";
      const k = isArtist ? "artist" : "patron";
      setKind(k);
      if (audience === "artist" && k === "patron") void navigate({ to: "/account" });
      if (audience === "patron" && k === "artist" && title === "Your Kalzo") void navigate({ to: "/artist" });
    });
    const { data } = api.auth.onAuthStateChange((_e, s) => setSigned(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <main className="kl-account kl-heritage">
      <img
        className="kl-paper-bg"
        src={paper.url}
        alt=""
        loading="lazy"
        onLoad={() => setPaperLoaded(true)}
        style={{ display: paperLoaded ? "block" : "none" }}
      />
      <KalzoAtmosphere />
      <div className="kl-inner">
        <nav className="kl-nav">
          <Link to="/">Kalzo</Link>
          {kind !== "artist" && <Link to="/account">My bookings</Link>}
          {kind !== "patron" && <Link to="/artist">Artist panel</Link>}
          <Link to="/support">Support</Link>
          <Link to="/faqs">FAQs</Link>
          {signed && <Button variant="outline" onClick={() => void logout()}><LogOut size={16} /> Log out</Button>}
        </nav>
        {logoutError && <p role="alert">{logoutError}</p>}
        <h1>{title}</h1>
        {signed === null ? (
          <p>Loading your account…</p>
        ) : signed ? (
          children
        ) : (
          <PatronGate audience={audience} onBack={() => navigate({ to: "/" })} />
        )}
      </div>
    </main>
  );
}
