import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PatronGate } from "@/kalzo/extras/PatronGate";
import { kalzoHead } from "@/lib/routeHead";
export const Route = createFileRoute("/profile")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>): { mode?: "create" | "login" } => ({ mode: s["mode"] === "login" ? "login" : "create" }),
  head: () => kalzoHead("Your profile", "Sign up or log in to your Kalzo artist or client account.", true),
  component: Profile,
});
function Profile() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const resolve = async () => {
      const { data, error: authError } = await api.auth.getUser();
      if (!active) return;
      if (!data?.user) { setReady(true); return; }
      if (authError) throw authError;
      // Navigate based on role from /me — no extra API calls needed
      const role = (data.user.role as string | undefined)?.toUpperCase();
      const dest = role === "ARTIST" ? "/artist/profile" : "/account";
      if (active) await navigate({ to: dest });
    };
    void resolve().catch(e => setError(e.message));
    const { data } = api.auth.onAuthStateChange(event => {
      if (event === "SIGNED_IN") setTimeout(() => void resolve().catch(e => setError(e.message)), 0);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [navigate]);
  return <main className="kl-account"><div className="kl-inner"><h1>Your Kalzo profile</h1>
    {error && <p role="alert">{error}</p>}
    {ready ? <PatronGate initialMode={mode ?? "create"} chooseAudience onBack={() => navigate({ to: "/" })} /> : <p>Opening your account…</p>}
  </div></main>;
}