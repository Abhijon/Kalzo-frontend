import { Link } from "@tanstack/react-router";
import { Phone, Mail, MessageCircle, Headset } from "lucide-react";
import { KALZO_CONTACT } from "@/lib/contacts";
import { openJoinArtistModal } from "./JoinArtistModal";

export function SiteFooter() {
  const handleEmailClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const isMobile =
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    if (isMobile) {
      e.preventDefault();
      window.location.href = `mailto:${KALZO_CONTACT.email.toLowerCase()}`;
    }
  };

  return (
    <footer className="kf">
      <div className="kf-grid">
        <div>
          <h4>About Kalzo</h4>
          <p>Kalzo brings you the fastest way to real artists near you — genuine kalakars in their own domain, even at the last moment. Zero off-platform risk, manual identity review, and 100% genuine artists.</p>
        </div>
        <div>
          <h4>Your Kalzo</h4>
          <Link to="/account">My bookings</Link>
          <button
            type="button"
            onClick={() => openJoinArtistModal()}
            className="kf-link"
          >
            Join as an artist
          </button>
        </div>
        <div>
          <h4>Help</h4>
          <Link to="/faqs">FAQs</Link>
          <Link to="/support">Booking and artist support</Link>
        </div>
        <div>
          <h4>Contact us</h4>
          <a href={`tel:${KALZO_CONTACT.phone}`}>
            <Phone size={14} className="inline mr-2" />
            {KALZO_CONTACT.displayPhone}
          </a>
          <a
            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${KALZO_CONTACT.email.toLowerCase()}`}
            target="_blank"
            rel="noreferrer"
            onClick={handleEmailClick}
            title="Open in Gmail"
            className="inline-flex items-center flex-wrap cursor-pointer"
          >
            <Mail size={14} className="inline mr-2 shrink-0" />
            <span>{KALZO_CONTACT.email.toLowerCase()}</span>
          </a>
        </div>
      </div>
      <div className="kf-cta">
        <a
          href={KALZO_CONTACT.whatsapp}
          target="_blank"
          rel="noreferrer"
          className="kf-btn kf-btn-solid"
        >
          <MessageCircle size={17} className="inline mr-2" />
          WhatsApp Kalzo
        </a>
        <Link to="/support" className="kf-btn kf-btn-solid">
          <Headset size={17} className="inline mr-2" />
          Chat with support
        </Link>
      </div>
      <p className="kf-copy">© 2026 Kalzo · Made in India</p>
    </footer>
  );
}
