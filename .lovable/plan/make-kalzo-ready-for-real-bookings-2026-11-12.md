# Make Kalzo ready for real bookings

## Current readiness
Kalzo is not yet ready for public paid bookings. Account creation and basic profile/booking saving exist, and Razorpay checkout is connected. However, the pictured “One booking, two phones” section uses fixed practice codes and simulated video progress. Aadhaar currently checks number format/checksum, accepts any six-digit practice OTP, and does not verify identity. Artist requests, wallets, withdrawals, availability and many listings are also demonstrations.

Payment verification currently checks a signature but does not bind a stored Razorpay order and its amount to the specific booking. That must be corrected before accepting public payments. Real refunds and artist payouts are not established by checkout alone.

## 1. Honest listings and artist joining
- Remove generated profiles and inflated artist/joining counts. Keep exactly one clearly labelled example; disable real payment for it.
- Add approved real profiles as artists join, rather than inventing listings, ratings, reviews or daily availability.
- Show accurate totals or omit audience counts until meaningful. Attract artists through clear booking opportunities, reels and transparent fees, not a fictitious patron audience.
- Save stage name, art form, description, locations, travel settings, rates, profile photo, Instagram and reels.
- Require two reels; allow two more. Let the artist choose their primary reel, which appears first on their profile.
- Save drafts and show review/verification status. Only genuinely verified, approved profiles become publicly bookable.

## 2. Real identity verification
- Remove simulated approval and misleading “OTP sent” / “face matched” claims from the real artist setup.
- Use a consent-based identity provider supporting an eligible Aadhaar/DigiLocker flow; use a separate supported selfie/liveness check if face verification is needed.
- Since you do not have a provider account yet, provider onboarding is a launch dependency. Compare the provider’s eligibility, charges and supported checks before requesting credentials.
- Keep full Aadhaar numbers and identity documents out of public profiles and support chat. Store only the minimum verification reference and result needed; provide appropriate consent and privacy information.
- A checksum, uploaded card or recorded video alone must never mark an artist verified.

## 3. One real booking, two account views
Each person uses their own signed-in account on their own phone. Codes belong to a booking, not to profile creation, and the artist cannot retrieve the patron’s secret codes.

| Step | Patron sees | Artist sees |
|---|---|---|
| Invitation and payment | Booking details, verified payment state, awaiting acceptance | Paid invitation addressed to their profile; accept or decline |
| Acceptance | Artist accepted; booking status | Accepted booking and venue; optional acceptance clip as requested |
| Arrival | Arrival code becomes available at the arrival step | Enter the code obtained from the patron at the venue |
| Venue proof | Arrival confirmed and saved venue proof | Record/upload a short live venue clip; cannot skip proof |
| Performance | Show in progress; closing code remains hidden | Start performance, then mark it finished |
| Completion | Share the closing code only when satisfied the show is complete | Enter closing code to confirm completion |
| Payout | Completed booking and payment status | Payout pending, then actual provider-confirmed payout status |

- Generate unpredictable codes securely on the server for each booking. Validate stage, participant, expiry and attempt limits; consume each code once.
- Show codes privately inside the patron’s booking page. SMS delivery is separate and requires a connected SMS service; account access does not require pretending an SMS was sent.
- Save video proof privately, accessible only to authorized booking participants/reviewers. Video evidence is not automatically proof of physical location or identity.
- Keep the compact walkthrough as an explicitly labelled illustration, separate from real booking pages.

## 4. Payments and safeguards
- Calculate charges from the approved profile and booking on the server, preserving existing fee tiers.
- Store the Razorpay order against its booking; verify order, amount, currency, payment capture and ownership before marking paid. Reject reuse against another booking.
- Add signed payment callbacks and reconciliation so closing the checkout tab does not lose payment state.
- Implement decline/refund handling with actual provider results, reconfirmation near the event, and a real wallet ledger.
- Treat final-code entry as completion authorization, not proof that money reached a bank. Configure the permitted artist payout arrangement with Razorpay; confirm eligibility for the proposed hold/advance/payout model before promising it.
- Preserve the agreed 100% upfront, 25% wallet advance and payout rules only once the corresponding real processes are connected. No simulated balances or withdrawals in real accounts.

## 5. Support and FAQs
Your choices: **separate issue conversations**, **saved in the signed-in account**.
- Add issue categories: booking inquiry, recent booking, artist acceptance, arrival/closing code, payment, cancellation/refund, payout, profile/reels, identity verification and other help.
- Each issue has its own conversation page, saved history and category; users can reopen it from their account.
- The AI can explain policies and read only the caller’s permitted booking information. It must not invent refunds, identity approval or payout confirmations, nor execute sensitive actions without authorization.
- Provide clear escalation to a person once your contact details are supplied.
- Add working FAQs covering booking, fees, verification, reels, arrival proof, codes, refunds and payouts. Do not invent cancellation charges or response-time promises.
- Replace placeholder email/phone/social details with your supplied values; use the same supplied WhatsApp number in Contact and “Connect on WhatsApp”.

## Technical approach
- Preserve the approved hero and vintage design. Keep imported layout changes in the existing template/logic renderer and add focused modules for real account workflows.
- Add authenticated booking, artist and support pages, owner-scoped data access, private media permissions, validated server functions and durable booking/payment records.
- Keep server secrets out of browser code; use provider results as the only authority for verification and payments.
- Add tests for two required/four maximum reels, one non-payable sample, participant permissions, code generation/stages/reuse/expiry, payment association, refunds and payout state.

## Launch check and dependencies
Before declaring launch ready, verify with separate patron and artist accounts: profile submission, approval, public listing, real invitation, acceptance, private codes, video save/readback, completion and payment reconciliation. Verify two saved support conversations remain separate after reload.

Still needed from you or external providers: identity-provider onboarding; actual email, phone, WhatsApp and Instagram details; SMS service only if text delivery is desired; approved payout setup; final cancellation/refund and privacy terms. Do not charge the sample listing or make a real-money test without your explicit approval.
