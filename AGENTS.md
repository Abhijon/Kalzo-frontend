<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->
- The Kalzo UI is rendered from src/kalzo/template.json (converted design markup) by src/kalzo/Kalzo.tsx, driven by src/kalzo/logic.js; edit logic/template there rather than hand-writing duplicate JSX, to keep the import faithful to the design.
- Artist portraits use dedicated bundled photos for named identities when available, otherwise a bundled photo pool with stable name assignments and collision avoidance within visible results; sample reels remain asset-pointer URLs in the template renderer.
- Kalzo add-on features (fees, chat moderation, Aadhaar check, artist setup) live as React/TS modules in src/kalzo/extras and are injected into template.json via custom kalzo-* tags handled in Kalzo.tsx; fee rules stay in extras/fees.ts so listings and checkout share one formula.
- Accounts, bookings and artist profiles live in Lovable Cloud (profiles/bookings/artist_profiles tables, RLS by owner); the template logic emits a `kalzo:pay` window event and extras/razorpay.ts persists the booking via saveBooking in extras/bookingSync.ts, so logic.js stays backend-free.
- Use native details/summary for the booking walkthrough disclosure so it opens before hydration as well as after page loading.
- Use bundled geographic state paths in india-map.json for the India illustration; keep location transforms on parent groups and animate child lights so talent markers stay geographically anchored.
- Payments use Razorpay Standard Checkout: client `src/kalzo/extras/razorpay.ts` listens for the `kalzo:pay` window event, saves the booking, creates an order via `/api/create-order`, opens checkout.js, and `/api/verify-payment` marks the booking `paid` only after HMAC-SHA256 signature verification — keys live in RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET secrets, never in code (the key id in razorpay.ts is the publishable live id).
- Real account workflows use authenticated server functions and RLS; public sample profiles cannot accept payments, and provider-dependent identity/payout states must never be simulated as successful.
- Artist identity verification is a live recorded face video reviewed manually by the admin against photo/Instagram; only admins set verification_status (DB trigger enforces).
- Admin privileges live only in user_roles and are verified server-side; the admin dashboard and support transcript reader use authenticated RLS reads after the role check, so private records never become public. Shared dashboard calculations live in extras/admin/metrics.ts; visitor telemetry is never inferred from accounts or bookings.
- Admin cancellation approval uses a role-checked database function to hold unreleased wallet entries and queue refunds without declaring provider transfers successful.
- Support issues have separate /support/$threadId URLs and account-owned persisted UIMessage histories; AI Elements provide the transcript/composer and Lovable AI stays server-only.
- Support composers sit above the transcript with explicit textarea dimensions so every category has a visible writing box before scrolling; shared contact constants keep footer, FAQs and AI guidance consistent.
- The decorative India illustration is mainland-only by user request; omit detached island regions and their lights, without changing stored geographic location choices.
- Enrollment totals come from the aggregate database function and exclude bundled samples; no time-based or client-invented growth.
- Artist panel opens booking requests at /artist, with /artist/location and /artist/profile plus booking/wallet profile subviews; shared ArtistBookings and LiveRecorder modules keep stage transitions and timed camera capture consistent. Wallet entries and notifications are written only by database functions/triggers, and bank numbers are saved via a definer function and never readable back in full.
- The shared account gate receives an explicit audience from its shell; artist signup validates only email, mobile and password and excludes patron metadata so booking questions cannot leak into artist onboarding.
- Artist location dropdowns use bundled location data through artist/LocationFields so saved city strings remain compatible with existing profiles.
- City-specific location updates use an owner-scoped database function without resubmitting identity review; booking cancellation requests hold unreleased wallet entries and require review rather than inventing a refund.
- Shared account shells own background lamp motion; InvitationDelivery owns envelope motion, keeping booking controls unchanged and respecting reduced motion.
- Artist entry screens reuse the original template welcome; artist-page reference media use asset pointers and cropped decorative borders so live account text remains editable.
- Profile preview is one supplied plaque image (interior blanked) with live photo/art/text placed by percentage; no cards or overlays on top.
- Early location preferences persist independently of artist submission and initialize the artist setup form, allowing location updates before identity review.
- Private conversations, meeting invitations and completion reviews use authenticated participant-scoped server functions; meeting acceptance remains setup-required until a real provider meeting exists.
- Artist media paths are bound to the profile owner by a database trigger and checked before public URL signing, preventing direct writes from exposing another account’s private uploads.

- Authentication emails use the scaffolded managed handler and shared React Email layout; signup and sign-in render the provider token instead of action links so the existing six-digit verification form works.
- Profile/For Artists resolve signed-in artists to their panel; the shared gate chooses audience before create/login. Audience metadata controls navigation, never authorization.
- Completion reviews share a server-validated schema requiring a rating and nonempty text so booking and account screens enforce the same rule.
- Invitation deadlines start at verified payment; a DB trigger blocks late acceptance and one SQL-only job persists reminders/closure without provider refund claims.
