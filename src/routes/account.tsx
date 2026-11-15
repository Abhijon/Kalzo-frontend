import { createFileRoute } from "@tanstack/react-router";
import { AccountShell } from "@/kalzo/extras/AccountShell";
import { PatronProfile } from "@/kalzo/extras/PatronProfile";
import { kalzoHead } from "@/lib/routeHead";
export const Route = createFileRoute("/account")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>): { tab?: string | undefined } => ({ tab: typeof s["tab"] === "string" ? s["tab"] : undefined }),
  head: () =>
    kalzoHead(
      "My Kalzo account",
      "Your private Kalzo profile, favourites, bookings and artist conversations.",
      true,
    ),
  component: AccountPage,
});
function AccountPage() {
  const { tab } = Route.useSearch();
  return <AccountShell title="Your Kalzo"><PatronProfile key={tab} initialTab={tab} /></AccountShell>;
}
