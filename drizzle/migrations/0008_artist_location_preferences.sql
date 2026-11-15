CREATE TABLE public.artist_location_preferences (owner_id uuid PRIMARY KEY, city text NOT NULL DEFAULT '', state text NOT NULL DEFAULT '', pricing jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.artist_location_preferences TO authenticated;
GRANT ALL ON public.artist_location_preferences TO service_role;
ALTER TABLE public.artist_location_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_location_read ON public.artist_location_preferences FOR SELECT TO authenticated USING (owner_id=auth.uid());
CREATE POLICY own_location_insert ON public.artist_location_preferences FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid());
CREATE POLICY own_location_update ON public.artist_location_preferences FOR UPDATE TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());