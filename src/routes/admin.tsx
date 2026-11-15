import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/kalzo/extras/admin/AdminDashboard";
import { kalzoHead } from "@/lib/routeHead";
export const Route = createFileRoute("/admin")({
  staticData: { sitemap: false },
  head: () =>
    kalzoHead(
      "Administration dashboard",
      "Private Kalzo dashboard for artist reviews, patrons, bookings, inquiries and support conversations.",
      true,
    ),
  component: AdminDashboard,
});
