CREATE TABLE public.event_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  event_code text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_active_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_presence TO authenticated;
GRANT ALL ON public.event_presence TO service_role;

ALTER TABLE public.event_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own event presence" ON public.event_presence FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);