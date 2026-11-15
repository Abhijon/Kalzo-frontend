# Kalzo panels, patron accounts and scheduled calls

The admin dashboard, support redesign and official contact links are complete. This plan covers the additional patron brief and artist-panel requests.

## Build
- Require a signed-in account before viewing real artist details or booking, while keeping the clearly labelled sample browsable.
- Keep patron signup separate from artist signup: real name, email, phone, account type, location and booking reason.
- Add an email-code verification step without treating an unverified signup as signed in.
- Create a vintage My profile area with editable account details, favourite artists, previously booked artists, bookings and support.
- Show real arrival and closing codes only at the corresponding booking stages, followed by a completion message and a saved artist review.
- Keep payment totals tied to the shared Kalzo fee calculation. Refunds normally return to the original payment source; do not collect bank details or claim a refund was processed without a verified payment-service flow.

## Artist panels and conversations
- Give artist and patron panels a coordinated heritage look: framed navigation, bottle-green/brass accents, relevant images and invitation-style booking items with restrained entrance animations. Preserve the approved homepage.
- Fix reel-upload styling so four stable square frames remain visible, each with a clear border and two required/two optional labels.
- Allow a signed-in artist to save current city/state and local pricing before submitting a full artist profile; carry these settings into the profile later.
- Add private patron–artist conversations, with chat and schedule-a-call actions from real artist profiles and an artist chat section.
- Add persisted notifications for new chats, meeting invitations, booking invitations and completed-booking reviews.
- Add a date/time picker with AM/PM, timezone, invitation status, artist accept/decline and a scheduled-calls view.
- Host accepted calls through Kalzo’s Zoom account. Show recording disclosure/consent and attach a private recording link to the conversation only after Zoom confirms processing.

## Technical details
- Extend the existing template renderer and account-owned Cloud records; retain server-side authorization and owner-scoped access.
- Persist favourites and reviews with explicit grants and ownership policies; allow reviews only for completed bookings belonging to the patron.
- Preserve separate, saved support conversations and the current artist signup fields.
- Persist conversations, messages and meeting requests with participant-only policies; create Zoom meetings server-side after artist acceptance, never expose host start URLs.
- New artist location preferences must not require a completed identity submission.
- Use Shadcn datepicker and existing design-system controls; support reduced motion and stable mobile reel dimensions.

## Validation and dependencies
- Verify profile edits, favourites and gated viewing as a real signed-in patron on desktop and phone.
- Verify email delivery and code confirmation against hosted auth settings.
- Paid arrival/closing, refund and review testing requires payments to be re-enabled safely, an approved artist and permission for a real payment test; do not simulate those outcomes.
- Embedded visitor totals remain a separate dependency: Lovable Analytics has no documented app-runtime reader currently available.

## Zoom setup
- Kalzo’s Zoom account must be connected with meeting and recording access before live calls can be created. No built-in Zoom connector is available; use a verified custom OAuth connection.
- Cloud recording requires a licensed user on an eligible paid account with recording enabled. Zoom notifies participants about recording.
- Meeting scheduling can be persisted before connection, but must clearly show that no Zoom meeting exists until the connection succeeds.
- Verify accepted invitation, real Zoom meeting creation and recording callback before claiming the call/recording flow works.
