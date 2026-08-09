-- 1. Profile fields for discovery + cross-device onboarding
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_discoverable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}'::text[];

-- 2. Notification metadata
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'activity',
  ADD COLUMN IF NOT EXISTS reference_id text;

-- 3. Real user-to-user connection requests
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT connection_requests_status_check CHECK (status IN ('pending','accepted','declined')),
  CONSTRAINT connection_requests_not_self CHECK (requester_id <> recipient_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS connection_requests_pair_unique
  ON public.connection_requests (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id));
CREATE INDEX IF NOT EXISTS connection_requests_recipient_idx ON public.connection_requests (recipient_id, status);
CREATE INDEX IF NOT EXISTS connection_requests_requester_idx ON public.connection_requests (requester_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_requests TO authenticated;
GRANT ALL ON public.connection_requests TO service_role;

ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read requests"
  ON public.connection_requests FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Requester can create a request"
  ON public.connection_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');

CREATE POLICY "Recipient can respond to a request"
  ON public.connection_requests FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id AND status IN ('accepted','declined'));

CREATE POLICY "Requester can cancel a pending request"
  ON public.connection_requests FOR DELETE TO authenticated
  USING (auth.uid() = requester_id AND status = 'pending');

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS connection_requests_touch ON public.connection_requests;
CREATE TRIGGER connection_requests_touch
  BEFORE UPDATE ON public.connection_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Server-side notification fan-out (browser can never write another user's row)
CREATE OR REPLACE FUNCTION public.notify_connection_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_name text;
  recipient_name text;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(full_name), ''), 'Someone') INTO requester_name
    FROM public.profiles WHERE id = NEW.requester_id;
  SELECT COALESCE(NULLIF(TRIM(full_name), ''), 'Someone') INTO recipient_name
    FROM public.profiles WHERE id = NEW.recipient_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, actor_id, kind, reference_id, title, body)
    VALUES (
      NEW.recipient_id, NEW.requester_id, 'connection_request', NEW.id::text,
      COALESCE(requester_name, 'Someone') || ' sent you a connection request',
      'Accept to let your Twins exchange context and start a conversation.'
    );
    RETURN NEW;
  END IF;

  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    INSERT INTO public.notifications (user_id, actor_id, kind, reference_id, title, body)
    VALUES (
      NEW.requester_id, NEW.recipient_id, 'connection_accepted', NEW.id::text,
      COALESCE(recipient_name, 'Someone') || ' accepted your connection request',
      'You are connected now — open the conversation to take it from here.'
    );
  ELSIF NEW.status = 'declined' AND OLD.status <> 'declined' THEN
    INSERT INTO public.notifications (user_id, actor_id, kind, reference_id, title, body)
    VALUES (
      NEW.requester_id, NEW.recipient_id, 'connection_declined', NEW.id::text,
      COALESCE(recipient_name, 'Someone') || ' declined your connection request',
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS connection_requests_notify ON public.connection_requests;
CREATE TRIGGER connection_requests_notify
  AFTER INSERT OR UPDATE ON public.connection_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_connection_request();

-- 5. Safe read paths (no broad profiles SELECT policy, no email exposure)
CREATE OR REPLACE FUNCTION public.search_people(_q text DEFAULT '', _limit int DEFAULT 24)
RETURNS TABLE (
  id uuid, full_name text, headline text, location text,
  avatar_url text, skills text[], twin_intelligence integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.headline, p.location, p.avatar_url, p.skills, p.twin_intelligence
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
    )
  ORDER BY p.twin_intelligence DESC, p.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 24), 1), 100);
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile(_id uuid)
RETURNS TABLE (
  id uuid, full_name text, headline text, location text,
  avatar_url text, skills text[], twin_intelligence integer, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.headline, p.location, p.avatar_url, p.skills,
         p.twin_intelligence, p.created_at
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id = _id
    AND (p.is_discoverable OR p.id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.list_my_connections()
RETURNS TABLE (
  id uuid, full_name text, headline text, location text,
  avatar_url text, skills text[], twin_intelligence integer, connected_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.headline, p.location, p.avatar_url, p.skills,
         p.twin_intelligence, cr.responded_at
  FROM public.connection_requests cr
  JOIN public.profiles p
    ON p.id = CASE WHEN cr.requester_id = auth.uid() THEN cr.recipient_id ELSE cr.requester_id END
  WHERE auth.uid() IS NOT NULL
    AND cr.status = 'accepted'
    AND auth.uid() IN (cr.requester_id, cr.recipient_id)
  ORDER BY cr.responded_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.get_notification_actors(_ids uuid[])
RETURNS TABLE (id uuid, full_name text, headline text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.headline, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.id = ANY(_ids);
$$;

REVOKE ALL ON FUNCTION public.search_people(text, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_connections() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_notification_actors(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_people(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notification_actors(uuid[]) TO authenticated;