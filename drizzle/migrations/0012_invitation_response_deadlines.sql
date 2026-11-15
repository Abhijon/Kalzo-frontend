ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS invitation_reminded_at timestamptz;
CREATE INDEX IF NOT EXISTS kalzo_pending_invitation_deadline ON public.bookings(invitation_sent_at) WHERE status='paid' AND workflow_stage='paid';
CREATE OR REPLACE FUNCTION public.kalzo_invitation_clock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status='paid' AND ((TG_OP='INSERT') OR OLD.status IS DISTINCT FROM 'paid') THEN NEW.invitation_sent_at:=clock_timestamp(); END IF;
 IF TG_OP='UPDATE' AND OLD.workflow_stage='paid' AND NEW.workflow_stage='accepted' AND OLD.invitation_sent_at IS NOT NULL AND OLD.invitation_sent_at + interval '30 minutes' <= clock_timestamp() THEN RAISE EXCEPTION 'This invitation has expired after 30 minutes'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER kalzo_invitation_clock BEFORE INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.kalzo_invitation_clock();
CREATE OR REPLACE FUNCTION public.kalzo_process_invitation_deadlines() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings%ROWTYPE; processed integer:=0;
BEGIN
 FOR b IN SELECT * FROM public.bookings WHERE status='paid' AND workflow_stage='paid' AND invitation_sent_at IS NOT NULL AND invitation_sent_at <= now()-interval '25 minutes' ORDER BY invitation_sent_at FOR UPDATE SKIP LOCKED LIMIT 200 LOOP
  IF b.invitation_sent_at <= now()-interval '30 minutes' THEN
   UPDATE public.bookings SET workflow_stage='cancelled',refund_status='review_required' WHERE id=b.id;
   UPDATE public.wallet_entries SET status='on_hold' WHERE booking_id=b.id AND status IN ('pending','available');
   PERFORM public.kalzo_notify(b.artist_owner_id,'booking','Invitation closed','No response within 30 minutes. This booking is closed.',b.id);
   PERFORM public.kalzo_notify(b.patron_id,'booking','Invitation expired','The artist did not respond within 30 minutes. Refund processing requires Kalzo review.',b.id);
   processed:=processed+1;
  ELSIF b.invitation_reminded_at IS NULL THEN
   UPDATE public.bookings SET invitation_reminded_at=now() WHERE id=b.id;
   PERFORM public.kalzo_notify(b.artist_owner_id,'booking','Five minutes left to respond','Please accept or decline your booking invitation before its 30-minute deadline.',b.id);
   processed:=processed+1;
  END IF;
 END LOOP;
 RETURN processed;
END $$;
REVOKE ALL ON FUNCTION public.kalzo_process_invitation_deadlines() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kalzo_process_invitation_deadlines() TO service_role;
CREATE OR REPLACE FUNCTION public.kalzo_deadline_state(p_sent_at timestamptz,p_now timestamptz) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE WHEN p_now>=p_sent_at+interval '30 minutes' THEN 'expired' WHEN p_now>=p_sent_at+interval '25 minutes' THEN 'reminder' ELSE 'waiting' END $$;
REVOKE ALL ON FUNCTION public.kalzo_deadline_state(timestamptz,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kalzo_deadline_state(timestamptz,timestamptz) TO authenticated,service_role;