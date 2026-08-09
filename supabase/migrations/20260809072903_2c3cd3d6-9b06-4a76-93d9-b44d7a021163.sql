ALTER TABLE public.connection_requests
  ADD COLUMN IF NOT EXISTS intro_note text;

CREATE OR REPLACE FUNCTION public.validate_intro_note()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.intro_note IS NOT NULL THEN
    NEW.intro_note = NULLIF(LEFT(TRIM(NEW.intro_note), 400), '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS connection_requests_validate_note ON public.connection_requests;
CREATE TRIGGER connection_requests_validate_note
  BEFORE INSERT OR UPDATE ON public.connection_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_intro_note();

CREATE OR REPLACE FUNCTION public.notify_connection_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      COALESCE(
        NEW.intro_note,
        'Accept to let your Twins exchange context and start a conversation.'
      )
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

REVOKE ALL ON FUNCTION public.validate_intro_note() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_connection_request() FROM PUBLIC, anon, authenticated;