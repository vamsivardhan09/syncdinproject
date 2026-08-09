ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goals text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS twin_summary text,
  ADD COLUMN IF NOT EXISTS public_card boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS previous_active_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_last_active_idx ON public.profiles (last_active_at DESC);

-- Discoverable members plus the signals needed to score them client-side with
-- the existing matching engine. Auth-gated, safe columns only.
CREATE OR REPLACE FUNCTION public.search_people_ranked(_q text DEFAULT ''::text, _limit integer DEFAULT 24)
RETURNS TABLE(
  id uuid, full_name text, headline text, location text, avatar_url text,
  skills text[], goals text[], interests text[], twin_summary text,
  twin_intelligence integer, last_active_at timestamptz, created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.headline, p.location, p.avatar_url,
         p.skills, p.goals, p.interests, p.twin_summary,
         p.twin_intelligence, p.last_active_at, p.created_at
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.is_discoverable
    AND p.id <> auth.uid()
    AND (
      COALESCE(TRIM(_q), '') = ''
      OR COALESCE(p.full_name, '') ILIKE '%' || TRIM(_q) || '%'
      OR COALESCE(p.headline, '') ILIKE '%' || TRIM(_q) || '%'
      OR COALESCE(p.location, '') ILIKE '%' || TRIM(_q) || '%'
      OR EXISTS (SELECT 1 FROM unnest(p.skills) s WHERE s ILIKE '%' || TRIM(_q) || '%')
      OR EXISTS (SELECT 1 FROM unnest(p.goals) g WHERE g ILIKE '%' || TRIM(_q) || '%')
      OR EXISTS (SELECT 1 FROM unnest(p.interests) i WHERE i ILIKE '%' || TRIM(_q) || '%')
    )
  ORDER BY p.last_active_at DESC, p.twin_intelligence DESC, p.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 24), 1), 100);
$$;

DROP FUNCTION IF EXISTS public.get_public_profile(uuid);
CREATE FUNCTION public.get_public_profile(_id uuid)
RETURNS TABLE(
  id uuid, full_name text, headline text, location text, avatar_url text,
  skills text[], goals text[], interests text[], twin_summary text,
  twin_intelligence integer, last_active_at timestamptz, created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.headline, p.location, p.avatar_url,
         p.skills, p.goals, p.interests, p.twin_summary,
         p.twin_intelligence, p.last_active_at, p.created_at
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id = _id
    AND (p.is_discoverable OR p.id = auth.uid());
$$;

DROP FUNCTION IF EXISTS public.list_my_connections();
CREATE FUNCTION public.list_my_connections()
RETURNS TABLE(
  id uuid, full_name text, headline text, location text, avatar_url text,
  skills text[], goals text[], interests text[], twin_summary text,
  twin_intelligence integer, last_active_at timestamptz, connected_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.headline, p.location, p.avatar_url,
         p.skills, p.goals, p.interests, p.twin_summary,
         p.twin_intelligence, p.last_active_at, cr.responded_at
  FROM public.connection_requests cr
  JOIN public.profiles p
    ON p.id = CASE WHEN cr.requester_id = auth.uid() THEN cr.recipient_id ELSE cr.requester_id END
  WHERE auth.uid() IS NOT NULL
    AND cr.status = 'accepted'
    AND auth.uid() IN (cr.requester_id, cr.recipient_id)
  ORDER BY cr.responded_at DESC NULLS LAST;
$$;

-- Lightweight presence ping. Rolls the previous visit forward only after a
-- 30-minute gap, so "since your last visit" stays meaningful within a session.
CREATE OR REPLACE FUNCTION public.touch_activity()
RETURNS timestamptz
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prev timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT CASE
           WHEN p.last_active_at < now() - interval '30 minutes' THEN p.last_active_at
           ELSE p.previous_active_at
         END
    INTO prev
    FROM public.profiles p
   WHERE p.id = auth.uid();

  UPDATE public.profiles
     SET previous_active_at = prev,
         last_active_at = now()
   WHERE id = auth.uid();

  RETURN prev;
END;
$$;

-- Opt-in public Personal Intelligence card: safe columns only, and only when
-- the owner has switched sharing on.
CREATE OR REPLACE FUNCTION public.get_shared_card(_id uuid)
RETURNS TABLE(
  id uuid, full_name text, headline text, location text, avatar_url text,
  skills text[], goals text[], interests text[], twin_summary text,
  twin_intelligence integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.headline, p.location, p.avatar_url,
         p.skills, p.goals, p.interests, p.twin_summary, p.twin_intelligence
  FROM public.profiles p
  WHERE p.id = _id AND p.public_card;
$$;

REVOKE ALL ON FUNCTION public.search_people_ranked(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.touch_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_people_ranked(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_card(uuid) TO anon, authenticated;