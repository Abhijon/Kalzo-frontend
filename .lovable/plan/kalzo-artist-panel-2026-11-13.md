# Kalzo Artist Panel

A dedicated, signed-in artist area with its own menu: **My Profile, Notifications, My Bookings, Wallet**. Same vintage Kalzo look (ivory, bronze, bottle green), bolder than today's plain form.

## 1. Sign up and "Become a Kalzo artist"
- Create account with Gmail (Google) or email + phone number.
- Verification code goes to **email** (free, works today). Phone code needs a paid SMS service (e.g. Twilio, about ₹0.20–0.50 per text) — added later when you connect one; phone number is still collected.
- After account creation, a bold "Become a Kalzo artist" card leads into the artist profile.

## 2. Artist profile (redesigned, eye-catching)
Vintage poster-style header with live preview: round art-form photo, profile photo, stage name, base city, current city.
Fields, in order:
- Stage name, base city, current city, Instagram profile URL
- Art form + **subcategory** (e.g. Musician → Classical vocalist / Guitarist / Tabla / Other – write your own)
- Hourly rate (₹)
- Travel and stay: **Included** (rate stays the same) or **Charged separately** → box appears for travel charges and stay/living charges
- Preferred cities (comma separated)
- **Changing current city** → pop-up: "What is your hourly rate here?" plus travel/stay for that city, with option "Travel and stay not needed here"
- About you / about your act
- Profile photograph + **art photograph** (shown in the round circle)
- **Show us your work**: four square vintage-framed reel tiles (2 required, 2 optional), tap star to make one **Primary** — that's what patrons see first
- **Identity verification**: live face video (already built) + **DigiLocker Aadhaar** check through Surepass
- **Bank details** for payouts (account holder, account number, IFSC) — only the last 4 digits are ever shown back
- Submit profile for verification

## 3. My Bookings
Each booking card walks through the steps:
1. **Accept / Reject**. Reject shows the warning: "Rejecting repeatedly may lower your profile's visibility."
2. Accept → "Congratulations! Your 25% advance will reach your wallet within 48 hours."
3. **Arrived at location** → enter the patron's arrival code
4. **Record a video** of the venue/performance (verification)
5. **Enter the patron's closing code**
6. Final screen: "Congratulations, you had an amazing performance today! Your payment will be released in the next 48–72 hours."
Codes are real, one-time, per booking (already secured in the database).

## 4. Notifications
New booking invitations, booking step updates, review results (profile verified / not matched), payout updates. Unread dot in the menu.

## 5. Wallet (My Earnings)
Advance received, pending, released to bank, with status per booking. Shows real figures only — zero until real paid bookings exist.

## Honest limits
- Payments are still paused, so no real booking reaches an artist yet; the flow above works once payments are switched back on safely.
- DigiLocker check needs your **Surepass API token** — I'll ask for it in a secure box when building.
- Phone OTP waits on an SMS service.

## Technical details
- New routes: `/artist` (layout with tabs), `/artist/profile`, `/artist/bookings`, `/artist/notifications`, `/artist/wallet`; replaces RealArtistSetup section in /account.
- Migration: artist_profiles add subcategory, art_photo_path, travel_charge_inr, stay_charge_inr, city_rates jsonb, reject_count; new tables `artist_notifications` (owner read/update-read), `artist_payout_accounts` (owner insert/update, masked read via function; admin read), `wallet_entries` (owner read, written only by server/trigger). Notifications inserted by triggers on bookings/verification changes.
- Reject increments reject_count via kalzo_booking_step; visibility ordering uses it.
- Surepass DigiLocker via server functions + `/api/public/surepass-callback`; only name/verified flag/last-4 stored, never full Aadhaar.
- Tests: reject warning rule, advance = 25% of booking, wallet totals.
