CREATE TABLE public.twin_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  source_id text NOT NULL,
  status text NOT NULL DEFAULT 'learned',
  file_name text,
  summary text,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.twin_imports TO authenticated;
GRANT ALL ON public.twin_imports TO service_role;
ALTER TABLE public.twin_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their own twin imports"
ON public.twin_imports FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER twin_imports_touch BEFORE UPDATE ON public.twin_imports
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.twin_oauth_states (
  nonce text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  provider text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.twin_oauth_states TO service_role;
ALTER TABLE public.twin_oauth_states ENABLE ROW LEVEL SECURITY;