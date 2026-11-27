import { useEffect, useId, useState } from "react";
import logoImg from "@/assets/kalzo-logo.png";
import { ProfileEntry } from "./ProfileEntry";

const LINKS = [
  { href: "#finder", label: "Find artists" },
  { href: "#artforms", label: "Art forms" },
  { href: "#promise", label: "The Promise" },
  { href: "#for-artists", label: "For Artists" },
] as const;

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="kmenu">
      <button
        type="button"
        className={`kmenu-btn${open ? " is-open" : ""}`}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="kmenu-bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>

      <div
        className={`kmenu-scrim${open ? " is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <div
        id={panelId}
        className={`kmenu-panel${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Kalzo menu"
        inert={!open ? true : undefined}
      >
        <div className="kmenu-body">
          <div className="kmenu-crest">
            <img src={logoImg} alt="Kalzo" className="kmenu-logo" />
            <em>where every mehfil finds its artist</em>
          </div>
          <nav className="kmenu-nav" aria-label="Site">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="kmenu-link"
                onClick={() => setOpen(false)}
              >
                <span>{l.label}</span>
              </a>
            ))}
            <div className="kmenu-profile">
              <ProfileEntry />
            </div>
          </nav>
          <p className="kmenu-foot">EST. MMXXVI — LIVE ARTS, AT YOUR DOOR</p>
        </div>
      </div>
    </div>
  );
}
