ALTER TABLE public.artist_profiles ADD COLUMN IF NOT EXISTS face_video_path text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.kalzo_protect_artist_verification() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE privileged boolean := current_user IN ('postgres','service_role') OR public.kalzo_is_admin();
BEGIN
  IF NOT privileged THEN
    IF TG_OP='INSERT' THEN
      IF NEW.verification_status <> 'not_started' THEN RAISE EXCEPTION 'Verification is decided by Kalzo review'; END IF;
    ELSIF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      RAISE EXCEPTION 'Verification cannot be self-approved';
    END IF;
    IF NEW.face_video_path <> '' AND (TG_OP='INSERT' OR NEW.face_video_path IS DISTINCT FROM OLD.face_video_path) THEN
      IF split_part(NEW.face_video_path,'/',1) <> auth.uid()::text THEN RAISE EXCEPTION 'Video must belong to your account'; END IF;
      NEW.verification_status := 'submitted';
    END IF;
  END IF;
  IF NEW.status='approved' AND (NEW.verification_status <> 'verified' OR jsonb_array_length(NEW.reels)<2 OR jsonb_array_length(NEW.reels)>4 OR NEW.photo_path='' OR NEW.face_video_path='') THEN
    RAISE EXCEPTION 'Verified face video, photo and 2 to 4 reels are required';
  END IF;
  RETURN NEW;
END $$;