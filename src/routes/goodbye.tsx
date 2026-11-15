import { createFileRoute, Link } from "@tanstack/react-router";
import { kalzoHead } from "@/lib/routeHead";
import { Button } from "@/components/ui/button";
import "@/kalzo/extras/account.css";
import logo from "@/assets/kalzo-logo.png.asset.json";
import "@/kalzo/extras/artist/panels.css";
export const Route = createFileRoute("/goodbye")({
  staticData: { sitemap: false },
  head: () => kalzoHead("Until the next mehfil", "You have signed out of Kalzo. Come back soon for your next live performance."),
  component: Goodbye,
});
function Goodbye() {
  return (
    <main className="kg-farewell">
      <div className="kg-card">
        <span className="kg-lamp" aria-hidden="true" />
        <img className="kg-logo" src={logo.url} alt="Kalzo logo" />
        <h1>Until the next mehfil</h1>
        <p>You have signed out safely. The lamp is still lit for your return.</p>
        <div className="kg-actions">
          <Button variant="outline" asChild><Link to="/">Back to Kalzo</Link></Button>
          <Button variant="outline" asChild><Link to="/profile" search={{ mode: "login" }}>Log in again</Link></Button>
        </div>
      </div>
    </main>
  );
}
