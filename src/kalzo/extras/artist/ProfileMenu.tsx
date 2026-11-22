import { Link, useRouterState } from "@tanstack/react-router";
import { UserRound, CalendarDays, Wallet } from "lucide-react";

export function ProfileMenu() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const links = [
    { to: "/artist/profile", label: "Profile update", icon: UserRound },
    { to: "/artist/bookings", label: "All bookings", icon: CalendarDays },
    { to: "/artist/wallet", label: "Wallet history", icon: Wallet },
  ] as const;
  return (
    <nav className="ka-profile-menu" aria-label="My profile sections">
      {links.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} className={path === to ? "on" : ""}>
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
