ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_relationship_notifications boolean NOT NULL DEFAULT true;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.email_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id uuid NOT NULL,
  actor_id uuid,
  kind text NOT NULL,
  dedupe_key text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_deliveries_dedupe_key_idx
  ON public.email_deliveries (dedupe_key);
CREATE INDEX IF NOT EXISTS email_deliveries_recipient_kind_idx
  ON public.email_deliveries (recipient_id, kind, created_at DESC);

GRANT ALL ON public.email_deliveries TO service_role;
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recipients can read their own email deliveries"
  ON public.email_deliveries FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id);
GRANT SELECT ON public.email_deliveries TO authenticated;