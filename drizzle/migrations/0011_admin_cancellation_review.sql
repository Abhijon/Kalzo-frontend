CREATE OR REPLACE FUNCTION public.kalzo_admin_cancel_review(p_booking uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE b public.bookings%ROWTYPE;
BEGIN
 IF NOT public.kalzo_is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 SELECT * INTO b FROM public.bookings WHERE id=p_booking FOR UPDATE;
 IF NOT FOUND OR b.status <> 'paid' OR b.refund_status <> 'review_required' THEN RAISE EXCEPTION 'Only paid bookings awaiting refund review can be approved'; END IF;
 UPDATE public.bookings SET workflow_stage='cancelled', refund_status='approved_pending_processing' WHERE id=p_booking;
 UPDATE public.wallet_entries SET status='on_hold' WHERE booking_id=p_booking AND status IN ('pending','available');
END $fn$;
REVOKE ALL ON FUNCTION public.kalzo_admin_cancel_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kalzo_admin_cancel_review(uuid) TO authenticated;
