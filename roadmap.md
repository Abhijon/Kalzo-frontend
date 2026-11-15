# Roadmap
- [x] Add Profile logout, direct signed-in artist entry, audience-first vintage chooser and popup client categories; guest/mobile flows and 15 rule tests passed.
- [ ] Verify live Profile logout and For Artists redirect; restored preview session still renders the guest menu, so signed-in checks remain blocked.
- [x] Add compact reference-shaped profile and shared artist/client mehfil motion; scheduled in-account 25-minute reminder and 30-minute closure. Live paid invitation callback validation remains unavailable without a paid booking.
- [ ] Phone push notifications require a push provider and registered devices; only in-account reminders are implemented.
- [x] Check repeated WhatsApp blocking and official number; correct homepage Profile button placement. Shared Codeshare example could not be retrieved; valid direct link preserved.
- [x] Replace empty booking poster with opening/closing envelope, clickable booking totals, lamp-led notifications/chat views and one seamless profile frame; location unchanged.
- [x] Add main-menu Profile signup/login and account-aware artist/client destination; client routing and logout verified; artist destination rule tested.
- [x] Retain patron booking ledger; surface chats/Zoom invitations and mandatory completion reviews; review rules tested. Real paid completion awaits a completed booking.
- [x] Add artist current-booking view, proof explanation/completion timing and restore welcome contrast; remove profile's extra paper layer.
- [x] Verify WhatsApp destination and refresh About Kalzo copy; editor sandbox restriction explained.
- [ ] Connect Kalzo-hosted recorded Zoom and accepted-call calendar delivery; organizer connection declined, so links, recordings and automatic calendar delivery remain unavailable.
- [x] Replace layered profile preview with the supplied single ornate frame, a large portrait and a round art photo; signed-in live text, asset loading and desktop/mobile layout checked.
- [x] Fix Join the House linking back to its welcome page; artist signup and login opened successfully at 843px.
- [ ] Six-digit email codes: owner must set Email OTP length to 6 in Auth settings; no agent tool changes this hosted setting.
- [ ] Use only the user's supplied artwork for this refresh; discard newly generated images.
- [ ] Animate the supplied artwork and add matching vintage graphic details without adding unrelated images.
- [ ] Refresh artist entry, profile-first navigation, centered moving carriage, ornate invitations and bold booking counters.
- [ ] Refine profile, location, notification and communication pages with dark text, vintage framing and motion; check signed-in desktop/mobile.
- [x] Soften artist poster to very light reddish paper with readable lettering and brass framing; checked at desktop, tablet and phone sizes.
- [x] Correct artist poster photo/text overlap and add colorful vintage framing; verified no overlap at 1280, 843 and 390px.
- [x] Add distinct vintage metric colors, larger activity graph and clickable admin review queues with cancellation/refund review controls; owner queues and inquiry history verified, five tests passed.
- [ ] Validate admin cancellation approval on a real paid cancellation; no paid review request exists, and original-source refund transfers remain unconnected.
- [x] Redesign admin graphics with vintage colors, original Kalzo logo, textured surfaces, engraved accents and animated controls; owner dashboard, search and mobile verified.
- [x] Apply new vintage-page references to artist panels; replace conspicuous green surfaces and refine vintage typography; chat page and phone overflow verified.
- [x] Add ownership checks at direct artist-profile writes and public signed URL reads; two regression tests passed. Security rescan and real two-account validation remain pending.
## Admin dashboard
- [x] Vintage paper panel backgrounds and carriage messenger with an opening booking invitation; animated navigation and reduced-motion support. Empty invitation checked desktop/mobile; no live invitation available for paid-flow validation.
- [x] Replace cropped pillars with a complete botanical invitation, display real booking counts and use “Your bookings are on the way.” for no invitations.
- [x] Artist-panel visual overhaul: heritage invitation frames, images, four square bordered reel slots, animated navigation and richer notification states.
- [x] Let signed-in artists save location and city pricing before submitting a full profile; location save and reload verified.
- [ ] Private patron/artist chat, rating/review/chat notifications and meeting invitation screens added; two-participant validation requires an approved real artist. Live Zoom meetings/recordings blocked by Zoom’s temporarily disabled app (4,704) and unconnected hosting account.
- [x] Support redesign: animated vintage categories, pointer cursors and an immediately visible writing box for every issue; explained WhatsApp editor-preview block; two issue histories verified.
- [x] Add owner-provided phone/WhatsApp +919079290502 and email Team@Kalzo.in across contact/help surfaces.
- [ ] Patron account refinements from the uploaded brief: gated artist details, email verification, editable profile, favorites, booked artists, arrival/closing milestones and post-performance reviews.
- [x] Vintage dashboard with overview, artists and verification media, patrons, bookings, inquiries and support histories.
- [x] Verify owner access, search/filter and support transcript on desktop and mobile; no artist rows available to exercise media review.
- [ ] Embedded visitor analytics requires a supported live analytics connection; no invented visit counts.

- [x] Service fee tiers (₹99/199/299/500) for artist and patron
- [x] Rates incl/excl travel & stay; base/current/preferred locations
- [x] Starting-from pricing for service vendors
- [x] Chat + masked call with off-platform warnings/flags
- [x] Payment flow: upfront hold, reconfirm, 25% wallet advance, arrival PIN + proof video, end OTP, payout
- [x] Aadhaar video verification
- [x] Reels: min 2, max 4
- [ ] WhatsApp assistant: answers leads 24/7, quotes prices, books a time, hands over to owner (needs WhatsApp Business connection + Cloud)
- [x] Patron account (name, location, type/industry, reason, email code) required before booking
- [x] Artist page: hide patron price, fee breakup pop-up, vintage colours, 4 reel slots, bank details + wallet withdraw
- [x] EST line in header: add a striking number + line so it feels out-of-the-box
- [x] Artist card: main photo = artist's own face, round circle = art form image, price + watch reel + book now under the poster (kill blank space)
- [x] Artist card: make it more creative / distinctive looking
- [x] Patron gate: offer Login as well as Create account
- [x] Patron lists: wishlist / star / "to look later" / "to book later", pick one and book from there
- [x] Join-the-house counter: starts 2,100, +1 every 5 minutes (time-based)

- [ ] Curtain hero: vintage art-room background, lamp lights up, KALZO slowly emerges into the light; illustrated/cartoon elements styled vintage too

- [ ] Curtain hero: KALZO lettering must use a full closed O, not the split/half O from the logo crop

- [x] Curtain hero: vintage stage + curtains opening, lamp lighting, KALZO emerging — but NOT all red; darker/aged palette so KALZO pops
- [x] Hero: keeper = the polished vintage stage (photo backdrop, lamp lighting up, curtains opening, "the house of" + bronze KALZO lettering) — the user picked this version
- [x] Real accounts (email + Google), saved bookings, artist profiles saved for review
- [x] Arrival-code + check-in practice screens (patron codes, artist arrival/end views)
- [ ] Razorpay payments — user chose Razorpay; needs key_id + key_secret (+ webhook secret later)
- [ ] Booking emails from kalzo.in — needs email domain setup

- [ ] Real payment gateway (Razorpay) — needs Razorpay keys
- [ ] Real arrival/end codes per booking + artist check-in screens wired to real bookings — needs payments (codes shown in-app, no SMS)
- [ ] Real WhatsApp number, email, Instagram in footer — placeholders now

- [x] Compact animated vintage booking walkthrough with clear patron and artist views
- [x] Make the walkthrough open reliably before and after page loading for patron and artist views
- [x] Restyle invite card as vintage invitation card
- [x] Hero stage: curved pillar-arch shape with opening curtains (per image-46)
- [ ] Hero redesign: golden gate image as transparent architectural overlay (pillars + arch + lanterns only, no rectangle/background), ivory page visible through centre, responsive
- [x] Hero: reverted to stage arch blending into ivory; removed golden gate
- [x] Hero copy: removed flanking lines, added luxury reassurance line
- [x] Hero section recolored warm tan per reference
- [x] Map visual: vintage all-India map + popping stars; on city select, swap to that city's famous landmark with same pop animation (browser verified: India map and Udaipur landmark swap)
- [x] Hero: gate tried, then user chose the stage arch instead
- [x] Hero copy: remove courtyard line + empty space; tagline "the house of the artists..."; last-moment line as highlighted vintage strip with distinct background; remove hero city search
- [x] Hero: stage restored as crisp dome arch (no fade, no rectangle); golden gate removed
- [x] Hero stage: curved dome top, crisp edges, no square boundary
- [x] Hero stage: extended vertically (clamp(430px,56vw,660px)) so pillars show base to capital — user confirmed "perfectly awesome", LOCKED: do not restyle the hero again
- [ ] Hero on phone screens: pillars are cropped out at ~390px wide (narrow crop keeps only the arch centre) — needs a portrait stage variant; awaiting user's go-ahead
- [x] Hero line "Find, watch and book live performers and artists near you" on a vintage parchment strip; last-moment strip recoloured (bottle green + brass) with a classic upright serif
- [x] Hero: both lines combined into one vintage note card (bottle green + brass double frame); "Kalzo makes it happen." on its own bold golden line
- [x] Hero note card: exact line "Whenever you need an artist, find, watch, and book live performance near you, even at a very last moment."; brass diamonds removed from the golden line

- [x] Correct India map with all 28 states and eight union-territory boundaries; staggered talent lights; desktop/mobile and city landmark swap verified.
- [x] Razorpay Standard Checkout: /api/create-order + /api/verify-payment (HMAC-SHA256, workerd-safe), pay button opens checkout, booking marked paid on verified signature; test keys stored as secrets. Verified: order creation, 401/400 paths, checkout modal with test Visa card up to bank OTP stage (simulator not automatable headless)
- [x] Razorpay go-live: live keys stored (RAZORPAY_LIVE_*), code prefers them over test keys; optional webhook secret for payment.captured still open
- [x] Duration filter: number buttons (ANY, 1-6) instead of a slider; even grid on desktop and phone
- [x] Header saved-list heart button restyled vintage (aged-parchment disc, bronze ring, brass heart)
- [x] Map: removed the detached southern island blob and remaining two stray dots below the Andaman chain; its talent light stays on the main chain

## Real-launch conversion
- [x] Replace generated artist listings and inflated counts with one clearly labelled, non-payable sample plus approved real profiles.
- [x] Save artist photo, Instagram, 2 required / 2 optional reels, and selected primary reel; publish only after real identity verification and review.
- [ ] Connect an identity-verification provider with consent; blocked until provider account/onboarding is available.
- [ ] Replace practice-only booking operations with patron/artist account views, secure per-booking arrival and closing codes, and saved venue video proof.
- [ ] Secure payment order amounts and booking association; implement refunds, reconfirmation and payout processing before public paid bookings.
- [x] Add account-saved support conversations per issue, categorized booking/refund/artist support, and real FAQs.
- [ ] Replace dummy contact information and connect shared WhatsApp links; blocked until contact details are supplied.
- [ ] Verify full two-account booking flow and payment lifecycle before declaring launch ready.
- [x] Add an owner-only admin panel listing artists and reels, patrons, bookings and support; grant access only to the verified requesting owner account.
- [x] Show actual artist enrollments, increasing only when real profiles enroll; remove all detached islands from the map illustration.

## Verified delivery and remaining launch dependencies
- [x] One non-payable sample, verified-profile directory reader, actual enrollment counter, and mainland-only map.
- [x] Artist photo, Instagram, 2–4 saved reels and selected primary reel; reloaded and read back through artist/admin UI with a temporary draft (removed after testing).
- [x] Owner-only admin register for artist media, registered accounts, bookings and support categories; verified as requesting owner.
- [x] Separate saved support issues with actual AI replies, independent URLs and reload restoration; FAQs and honest contact placeholders.
- [x] Per-account booking readers and atomic artist-side stage/code checks with private venue-video upload; no real booking created or charged.
- [ ] Complete payment-to-booking association, code issuance after verified capture, reconfirmation, refunds and wallet/payout processing: public payments paused; waiting on approved payout setup and verified real artist/provider onboarding before paid end-to-end testing.
- [ ] Real Aadhaar/DigiLocker identity and optional liveness: provider account/onboarding required; no real identity checks claimed.
- [ ] Final cancellation/refund/privacy terms and real support contacts/WhatsApp: owner input required.
- [ ] Two-account paid booking/code/video/payout end-to-end validation: blocked by verified artist, provider setup and explicit approval for a real payment test.
- [x] Artist panel: profile redesign, bookings accept/reject flow, notifications, wallet, bank details
- [ ] DigiLocker Aadhaar check — needs Surepass API token

## Artist panel refinement
- [x] Booking-first navigation, dedicated location update and profile menu
- [x] Searchable city/state choices, legal name, mandatory fields and city-specific charges
- [x] Four-digit booking codes, live 10–15 second venue proof and cancellation review
- [x] Booking history filters, payment breakdown and wallet balance states
- [x] Animated recording guidance and vintage presentation; verify signed-in desktop/mobile
- [ ] DigiLocker verification and real bank settlement remain dependent on provider setup

- [ ] Confirm the complete paid booking lifecycle and fee-bound settlement: payments remain paused, no paid bookings exist; provider setup and approved payment testing required.

## Email-code login and in-app booking codes (built with Claude, 2026-11-13)
- [x] No SMS anywhere: login and signup use a 6-digit email code (or Google); passwords removed from the sign-in screen
- [x] Patron booking page shows the active arrival/closing code as a large vintage card (Rapido-style), auto-refreshing
- [x] "My bookings" shows a pulsing alert when a code is ready
- [ ] Auth email template must show the 6-digit code ({{ .Token }}) instead of only a link
- [ ] Optional: in-app notification row for the patron when a code becomes available (needs a database trigger)

## Real bookings and secure payments (built with Claude, 2026-11-13)
- [x] Fee model confirmed by owner: flat bands ₹99 / ₹199 / ₹299 / ₹500 by rate, charged to patron and artist
- [x] Server creates the booking and computes the price (rate x hours/plates + travel + stay + fee); browser amounts are never trusted
- [x] Razorpay order stored on its booking (order notes carry the booking id); verify checks signature, order, amount, currency and capture with Razorpay itself
- [x] Paid booking gets two different one-time 4-digit codes (secure random), valid until 2 days after the event; artist is notified by the existing trigger
- [x] Payment recovery: booking page re-checks Razorpay if the checkout tab was closed ("CHECK PAYMENT")
- [x] Real artists are bookable: 10 AM–10 PM hours, all days open until they set availability, no hours under 2 hours away
- [x] Calendar shows the real next 14 days (was fixed to 10–23 November)
- [x] Real artist prices on the page use their own city rates and travel/stay (no generated prices)
- [x] Payments switch: OFF unless secret KALZO_PAYMENTS=live; emails in KALZO_PAYMENT_TESTERS can test while off
- [ ] DB (Lovable): wallet advance/balance must use artist_net_inr, not amount_inr (patron total incl. fee)
- [ ] DB (Lovable): remove patron direct insert policy on bookings (server creates bookings now)
- [ ] Refunds for declined/cancelled bookings and artist payouts (Razorpay Route approval needed)

## Email setup
- [x] Confirm team@kalzo.in as the existing reply/contact inbox and explain where to add notify subdomain DNS records without changing the Hostinger mailbox.
- [x] Configure notify.kalzo.in and prepare branded authentication emails with signup/sign-in codes and monitored reply address.
- [ ] Activate and verify live code delivery after sender DNS verification and publishing; verification is pending.
