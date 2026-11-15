CREATE OR REPLACE FUNCTION public.kalzo_validate_booking_codes() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.arrival_code !~ '^[0-9]{4}$' OR NEW.closing_code !~ '^[0-9]{4}$' OR NEW.arrival_code=NEW.closing_code THEN RAISE EXCEPTION 'Arrival and closing OTPs must be distinct four-digit codes'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER kalzo_validate_booking_codes BEFORE INSERT OR UPDATE OF arrival_code,closing_code ON public.booking_codes FOR EACH ROW EXECUTE FUNCTION public.kalzo_validate_booking_codes();