import { Link } from "@tanstack/react-router";
import { Phone, Mail, MessageCircle, Headset } from "lucide-react";
import { KALZO_CONTACT } from "@/lib/contacts";
export function SiteFooter() {
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
          <Link to="/for-artists">Join as an artist</Link>
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
          <a href={`mailto:${KALZO_CONTACT.email}`}>
            <Mail size={14} className="inline mr-2" />
            {KALZO_CONTACT.email}
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
