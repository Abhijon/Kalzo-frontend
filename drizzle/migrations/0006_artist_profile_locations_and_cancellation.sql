ALTER TABLE public.artist_profiles ADD COLUMN legal_name text NOT NULL DEFAULT '', ADD COLUMN current_state text NOT NULL DEFAULT '', ADD COLUMN preferred_states text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.bookings ADD COLUMN artist_fee_inr integer, ADD COLUMN artist_net_inr integer, ADD COLUMN performance_subtotal_inr integer;
CREATE OR REPLACE FUNCTION public.kalzo_request_artist_cancellation(p_booking uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings%ROWTYPE;
BEGIN
 SELECT * INTO b FROM public.bookings WHERE id=p_booking FOR UPDATE;
 IF NOT FOUND OR b.artist_owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the booked artist can request cancellation'; END IF;
 IF b.status <> 'paid' OR b.workflow_stage NOT IN ('accepted','arrived','arrival_confirmed','checked_in') THEN RAISE EXCEPTION 'Cancellation can be requested only before the performance starts'; END IF;
 UPDATE public.bookings SET workflow_stage='cancellation_requested',refund_status='review_required' WHERE id=p_booking;
 UPDATE public.wallet_entries SET status='on_hold' WHERE booking_id=p_booking AND status IN ('pending','available');
 PERFORM public.kalzo_notify(b.artist_owner_id,'booking','Cancellation requested','Kalzo will review this cancellation and any payment adjustments.',p_booking);
 RETURN 'cancellation_requested';
END $$;
REVOKE ALL ON FUNCTION public.kalzo_request_artist_cancellation(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kalzo_request_artist_cancellation(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.kalzo_update_artist_location(p_city text,p_state text,p_rate integer,p_travel text,p_travel_charge integer,p_stay_charge integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF length(trim(p_city))<1 OR length(p_city)>100 OR length(trim(p_state))<1 OR length(p_state)>100 OR p_rate NOT BETWEEN 1 AND 100000 OR p_travel NOT IN ('included','separate','not_needed') OR p_travel_charge NOT BETWEEN 0 AND 500000 OR p_stay_charge NOT BETWEEN 0 AND 500000 THEN RAISE EXCEPTION 'Check city, state and charges'; END IF;
 UPDATE public.artist_profiles SET current_city=trim(p_city),current_state=trim(p_state),city_rates=city_rates || jsonb_build_object(trim(p_city),jsonb_build_object('rate',p_rate,'travel',p_travel,'travel_charge',CASE WHEN p_travel='separate' THEN p_travel_charge ELSE 0 END,'stay_charge',CASE WHEN p_travel='separate' THEN p_stay_charge ELSE 0 END)),updated_at=now() WHERE owner_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Create your artist profile first'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.kalzo_update_artist_location(text,text,integer,text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kalzo_update_artist_location(text,text,integer,text,integer,integer) TO authenticated,service_role;