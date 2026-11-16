import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { accountDestination } from "./accountDestination";
import "./gate.css";

const clientTabs = ["My profile", "Bookings", "Favourite artists", "Booked artists", "Chats & calls"];
const artistLinks = [
  { to: "/artist/profile", label: "My profile" },
  { to: "/artist", label: "Booking requests" },
  { to: "/artist/location", label: "Location update" },
  { to: "/artist/notifications", label: "Notifications" },
  { to: "/artist/chats", label: "Chats & calls" },
] as const;

export function ProfileEntry() {
  const navigate = useNavigate(), queryClient = useQueryClient();
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const logout = async () => {
    setLoggingOut(true); setLogoutError("");
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await api.auth.signOut();
    if (error) { setLogoutError("Couldn't log out. Please try again."); setLoggingOut(false); return; }
    await navigate({ to: "/goodbye", replace: true });
  };
  const [kind, setKind] = useState<"guest" | "client" | "artist">("guest");
  useEffect(() => {
    let active = true;
    const resolve = async () => {
      const { data } = await api.auth.getUser();
      if (!data?.user) { if (active) setKind("guest"); return; }
      // Use role directly from /me response — no extra table lookups needed
      const role = (data.user.role as string | undefined)?.toUpperCase();
      if (active) setKind(role === "ARTIST" ? "artist" : "client");
    };
    void resolve();
    const { data } = api.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT") setTimeout(() => void resolve(), 0);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return <Popover><PopoverTrigger asChild><Button variant="ghost" className="klink knav k-profile-entry" aria-label="Profile"><UserRound size={17} /><span>Profile</span></Button></PopoverTrigger>
    <PopoverContent className="kpm">
      <div className="kpm-head">Your Kalzo</div><div className="kpm-list">
        {kind === "guest" && <>
          <Link to="/profile" search={{ mode: "create" }} className="kpm-item">Sign up</Link>
          <Link to="/profile" search={{ mode: "login" }} className="kpm-item">Log in</Link>
        </>}
        {kind === "client" && clientTabs.map((t) => <Link to="/account" search={{ tab: t }} key={t}  className="kpm-item">{t}</Link>)}
        {kind === "artist" && artistLinks.map((l) => <Link to={l.to} key={l.to}  className="kpm-item">{l.label}</Link>)}
        {kind !== "guest" && <Button variant="ghost" className="kpm-item kpm-logout" disabled={loggingOut} onClick={() => void logout()}><LogOut size={16} />{loggingOut ? "Signing out…" : "Log out"}</Button>}
        {logoutError && <p role="alert">{logoutError}</p>}
      </div>
    </PopoverContent></Popover>;
}
