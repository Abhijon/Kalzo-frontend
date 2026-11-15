import { createFileRoute, Link } from "@tanstack/react-router";
import { kalzoHead } from "@/lib/routeHead";
import { KALZO_CONTACT } from "@/lib/contacts";
import "@/kalzo/extras/account.css";
const faqs = [
  [
    "Can I book the sample artist?",
    "No. The single example shows the profile design and does not accept payments or send a real invitation.",
  ],
  [
    "How do artists join?",
    "Create an account, save a profile photo, your rate and locations, and two reels. Two additional reels are optional. Choose which reel appears first. Profiles stay private pending identity verification and review.",
  ],
  [
    "How are artists verified?",
    "Each artist records a short live face video in their profile. The Kalzo team compares it with their profile photo and Instagram account, and only then marks the profile verified.",
  ],
  [
    "How do I log in? Is there a password?",
    "No password needed. Enter your email and we send you a 6-digit code; type it in and you're signed in. You can also continue with Google.",
  ],
  [
    "When are booking codes created?",
    "Codes belong to each booking, not to your account signup. Like a cab ride code, they show inside your Kalzo booking page, never by SMS: the arrival code when your artist reaches your venue, and the closing code when the show ends. Tell the code to your artist in person.",
  ],
  [
    "What does the artist do at the venue?",
    "Enter the arrival code supplied by the patron, then save a venue video before starting the performance. Once the performance finishes, enter the patron’s closing code.",
  ],
  [
    "Does the final code prove payment reached the artist?",
    "No. It confirms completion and authorizes the next payout step. A bank payout must be confirmed by the payment service. Artist payout setup is pending.",
  ],
  [
    "What happens if the artist declines?",
    "The booking is marked declined and refund review is required. A refund is not confirmed until the payment service processes it.",
  ],
  [
    "Are payments available now?",
    "New public payments are paused while verified listings, secure payment association, refunds and payout arrangements are completed.",
  ],
  [
    "What are the service fees?",
    "The fee follows the artist rate: ₹99 up to ₹2,500; ₹199 from ₹2,501 to ₹5,000; ₹299 from ₹5,001 to ₹7,500; ₹500 above ₹7,500. The same fee applies separately to patron and artist.",
  ],
  [
    "How can I get help?",
    `Open Support, choose an issue category, and start a conversation. Each issue is saved separately in your account. Contact Kalzo on WhatsApp or phone at ${KALZO_CONTACT.displayPhone}, or email ${KALZO_CONTACT.email}.`,
  ],
];
export const Route = createFileRoute("/faqs")({
  staticData: { sitemap: true },
  head: () =>
    kalzoHead(
      "Frequently asked questions",
      "Kalzo booking, artist profiles, reels, verification, codes and payment questions.",
    ),
  component: () => (
    <main className="kl-account">
      <div className="kl-inner">
        <Link to="/">← Kalzo</Link>
        <h1>Frequently asked questions</h1>
        {faqs.map(([q, a]) => (
          <details key={q} className="kl-item">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
        <Link to="/support">Contact support →</Link>
      </div>
    </main>
  ),
});
