ALTER TABLE public.artist_profiles
  ADD COLUMN IF NOT EXISTS subcategory text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS art_photo_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS travel_charge_inr integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stay_charge_inr integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS city_rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reject_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.kalzo_protect_reject_count() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NOT (current_user IN ('postgres','service_role') OR public.kalzo_is_admin()) THEN
    IF TG_OP='INSERT' THEN NEW.reject_count := 0;
    ELSIF NEW.reject_count IS DISTINCT FROM OLD.reject_count THEN RAISE EXCEPTION 'Not allowed'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS kalzo_protect_reject_count ON public.artist_profiles;
CREATE TRIGGER kalzo_protect_reject_count BEFORE INSERT OR UPDATE ON public.artist_profiles FOR EACH ROW EXECUTE FUNCTION public.kalzo_protect_reject_count();

CREATE TABLE public.artist_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'booking',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  booking_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.artist_notifications TO authenticated;
GRANT UPDATE (read) ON public.artist_notifications TO authenticated;
GRANT ALL ON public.artist_notifications TO service_role;
ALTER TABLE public.artist_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_notif_read ON public.artist_notifications FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY own_notif_update ON public.artist_notifications FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX ON public.artist_notifications (owner_id, created_at DESC);

CREATE TABLE public.artist_payout_accounts (
  owner_id uuid PRIMARY KEY,
  holder_name text NOT NULL,
  account_number text NOT NULL,
  account_last4 text NOT NULL,
  ifsc text NOT NULL,
  bank_name text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (owner_id, holder_name, account_last4, ifsc, bank_name, updated_at) ON public.artist_payout_accounts TO authenticated;
GRANT ALL ON public.artist_payout_accounts TO service_role;
ALTER TABLE public.artist_payout_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_payout_read ON public.artist_payout_accounts FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.kalzo_is_admin());

CREATE OR REPLACE FUNCTION public.kalzo_save_payout(p_holder text, p_number text, p_ifsc text, p_bank text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF length(trim(p_holder)) < 2 OR length(p_holder) > 100 THEN RAISE EXCEPTION 'Enter the account holder name'; END IF;
  IF p_number !~ '^[0-9]{9,18}$' THEN RAISE EXCEPTION 'Account number must be 9 to 18 digits'; END IF;
  IF upper(p_ifsc) !~ '^[A-Z]{4}0[A-Z0-9]{6}$' THEN RAISE EXCEPTION 'Enter a valid IFSC code'; END IF;
  INSERT INTO public.artist_payout_accounts(owner_id,holder_name,account_number,account_last4,ifsc,bank_name,updated_at)
  VALUES (auth.uid(), trim(p_holder), p_number, right(p_number,4), upper(p_ifsc), left(coalesce(p_bank,''),100), now())
  ON CONFLICT (owner_id) DO UPDATE SET holder_name=EXCLUDED.holder_name, account_number=EXCLUDED.account_number, account_last4=EXCLUDED.account_last4, ifsc=EXCLUDED.ifsc, bank_name=EXCLUDED.bank_name, updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.kalzo_save_payout(text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kalzo_save_payout(text,text,text,text) TO authenticated;

CREATE TABLE public.wallet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  kind text NOT NULL,
  amount_inr integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  release_after timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, kind)
);
GRANT SELECT ON public.wallet_entries TO authenticated;
GRANT ALL ON public.wallet_entries TO service_role;
ALTER TABLE public.wallet_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_wallet_read ON public.wallet_entries FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.kalzo_is_admin());

CREATE OR REPLACE FUNCTION public.kalzo_notify(p_owner uuid, p_kind text, p_title text, p_body text, p_booking uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  INSERT INTO public.artist_notifications(owner_id,kind,title,body,booking_id) VALUES (p_owner,p_kind,p_title,p_body,p_booking);
$$;
REVOKE ALL ON FUNCTION public.kalzo_notify(uuid,text,text,text,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.kalzo_booking_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.artist_owner_id IS NOT NULL AND NEW.status='paid' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    PERFORM public.kalzo_notify(NEW.artist_owner_id,'booking','New booking invitation',coalesce(NEW.event_date,'')||' '||coalesce(NEW.slot,'')||' — accept or reject in My bookings.',NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER kalzo_booking_notify AFTER INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.kalzo_booking_notify();

CREATE OR REPLACE FUNCTION public.kalzo_review_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status AND NEW.verification_status IN ('verified','failed') THEN
    PERFORM public.kalzo_notify(NEW.owner_id,'review',
      CASE WHEN NEW.verification_status='verified' THEN 'Identity verified' ELSE 'Verification not matched' END,
      CASE WHEN NEW.verification_status='verified' THEN 'Your face video matched your profile.' ELSE 'Please record a new face video in My profile.' END, NULL);
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    PERFORM public.kalzo_notify(NEW.owner_id,'review',
      CASE WHEN NEW.status='approved' THEN 'Your profile is live' ELSE 'Profile needs changes' END,
      CASE WHEN NEW.status='approved' THEN 'Patrons can now find and book you.' ELSE 'Review your profile and submit again.' END, NULL);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER kalzo_review_notify AFTER UPDATE ON public.artist_profiles FOR EACH ROW EXECUTE FUNCTION public.kalzo_review_notify();

CREATE OR REPLACE FUNCTION public.kalzo_booking_step(p_booking uuid, p_action text, p_code text DEFAULT ''::text, p_video text DEFAULT ''::text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE b public.bookings%ROWTYPE; c public.booking_codes%ROWTYPE; adv integer; BEGIN SELECT * INTO b FROM public.bookings WHERE id=p_booking FOR UPDATE; IF NOT FOUND OR b.artist_owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the booked artist can perform this step'; END IF; IF b.status <> 'paid' THEN RAISE EXCEPTION 'Verified payment required'; END IF; SELECT * INTO c FROM public.booking_codes WHERE booking_id=p_booking FOR UPDATE;
adv := round(b.amount_inr*0.25);
IF p_action='accept' AND b.workflow_stage='paid' THEN UPDATE public.bookings SET workflow_stage='accepted' WHERE id=p_booking;
  INSERT INTO public.wallet_entries(owner_id,booking_id,kind,amount_inr,release_after) VALUES (auth.uid(),p_booking,'advance',adv,now()+interval '48 hours') ON CONFLICT DO NOTHING;
  PERFORM public.kalzo_notify(auth.uid(),'payment','25% advance on its way','₹'||adv||' will reach your wallet within 48 hours.',p_booking);
  RETURN 'accepted';
ELSIF p_action='arrive' AND b.workflow_stage='accepted' THEN IF c.booking_id IS NULL OR c.expires_at<now() THEN RAISE EXCEPTION 'Arrival code is unavailable or expired'; END IF; UPDATE public.bookings SET workflow_stage='arrived' WHERE id=p_booking; RETURN 'arrived';
ELSIF p_action='arrival_code' AND b.workflow_stage='arrived' THEN IF c.arrival_used OR c.expires_at<now() OR c.arrival_attempts>=5 THEN RAISE EXCEPTION 'Arrival code unavailable, expired or locked'; END IF; IF c.arrival_code<>p_code THEN UPDATE public.booking_codes SET arrival_attempts=arrival_attempts+1 WHERE booking_id=p_booking; RETURN 'incorrect_code'; END IF; UPDATE public.booking_codes SET arrival_used=true WHERE booking_id=p_booking; UPDATE public.bookings SET workflow_stage='arrival_confirmed' WHERE id=p_booking; RETURN 'arrival_confirmed';
ELSIF p_action='venue_video' AND b.workflow_stage='arrival_confirmed' THEN IF p_video NOT LIKE auth.uid()::text||'/%' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='kalzo-media' AND name=p_video) THEN RAISE EXCEPTION 'Upload your venue video first'; END IF; UPDATE public.bookings SET venue_video_path=p_video,workflow_stage='checked_in' WHERE id=p_booking; RETURN 'checked_in';
ELSIF p_action='start' AND b.workflow_stage='checked_in' THEN UPDATE public.bookings SET workflow_stage='performing' WHERE id=p_booking; RETURN 'performing';
ELSIF p_action='finish' AND b.workflow_stage='performing' THEN UPDATE public.bookings SET workflow_stage='finished' WHERE id=p_booking; RETURN 'finished';
ELSIF p_action='closing_code' AND b.workflow_stage='finished' THEN IF c.closing_used OR c.expires_at<now() OR c.closing_attempts>=5 THEN RAISE EXCEPTION 'Closing code unavailable, expired or locked'; END IF; IF c.closing_code<>p_code THEN UPDATE public.booking_codes SET closing_attempts=closing_attempts+1 WHERE booking_id=p_booking; RETURN 'incorrect_code'; END IF; UPDATE public.booking_codes SET closing_used=true WHERE booking_id=p_booking; UPDATE public.bookings SET workflow_stage='completed',payout_status='setup_required' WHERE id=p_booking;
  INSERT INTO public.wallet_entries(owner_id,booking_id,kind,amount_inr,release_after) VALUES (auth.uid(),p_booking,'balance',b.amount_inr-adv,now()+interval '72 hours') ON CONFLICT DO NOTHING;
  PERFORM public.kalzo_notify(auth.uid(),'payment','Performance complete','Your remaining ₹'||(b.amount_inr-adv)||' will be released within 48–72 hours.',p_booking);
  RETURN 'completed';
ELSIF p_action='decline' AND b.workflow_stage='paid' THEN UPDATE public.bookings SET workflow_stage='declined',refund_status='review_required' WHERE id=p_booking; UPDATE public.artist_profiles SET reject_count=reject_count+1 WHERE owner_id=auth.uid(); RETURN 'declined'; END IF; RAISE EXCEPTION 'This action is not allowed at this booking stage'; END $function$;

CREATE OR REPLACE FUNCTION public.kalzo_public_artists()
 RETURNS TABLE(id uuid, stage_name text, discipline text, base_city text, state_name text, bio text, rate_inr integer, instagram text, primary_reel integer, pricing_unit text, current_city text, preferred_cities text[], travel_setting text, availability jsonb)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT id,stage_name,discipline,base_city,state_name,bio,rate_inr,instagram,primary_reel,pricing_unit,current_city,preferred_cities,travel_setting,availability FROM public.artist_profiles WHERE status='approved' AND verification_status='verified' ORDER BY reject_count ASC, updated_at DESC $function$;