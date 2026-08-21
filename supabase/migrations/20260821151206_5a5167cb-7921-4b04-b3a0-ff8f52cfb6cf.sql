DROP FUNCTION IF EXISTS public.search_people_ranked(text, integer);
CREATE OR REPLACE FUNCTION public.search_people_ranked(_q text DEFAULT ''::text, _limit integer DEFAULT 24)
 RETURNS TABLE(id uuid, full_name text, headline text, location text, avatar_url text, skills text[], goals text[], interests text[], twin_summary text, twin_intelligence integer, last_active_at timestamp with time zone, created_at timestamp with time zone, latitude double precision, longitude double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name, p.headline, p.location, p.avatar_url,
         p.skills, p.goals, p.interests, p.twin_summary,
         p.twin_intelligence, p.last_active_at, p.created_at,
         p.latitude, p.longitude
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
$function$;

DROP FUNCTION IF EXISTS public.list_my_connections();
CREATE OR REPLACE FUNCTION public.list_my_connections()
 RETURNS TABLE(id uuid, full_name text, headline text, location text, avatar_url text, skills text[], goals text[], interests text[], twin_summary text, twin_intelligence integer, last_active_at timestamp with time zone, connected_at timestamp with time zone, latitude double precision, longitude double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name, p.headline, p.location, p.avatar_url,
         p.skills, p.goals, p.interests, p.twin_summary,
         p.twin_intelligence, p.last_active_at, cr.responded_at,
         p.latitude, p.longitude
  FROM public.connection_requests cr
  JOIN public.profiles p
    ON p.id = CASE WHEN cr.requester_id = auth.uid() THEN cr.recipient_id ELSE cr.requester_id END
  WHERE auth.uid() IS NOT NULL
    AND cr.status = 'accepted'
    AND auth.uid() IN (cr.requester_id, cr.recipient_id)
  ORDER BY cr.responded_at DESC NULLS LAST;
$function$;

DROP FUNCTION IF EXISTS public.get_public_profile(uuid);
CREATE OR REPLACE FUNCTION public.get_public_profile(_id uuid)
 RETURNS TABLE(id uuid, full_name text, headline text, location text, avatar_url text, skills text[], goals text[], interests text[], twin_summary text, twin_intelligence integer, last_active_at timestamp with time zone, created_at timestamp with time zone, latitude double precision, longitude double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name, p.headline, p.location, p.avatar_url,
         p.skills, p.goals, p.interests, p.twin_summary,
         p.twin_intelligence, p.last_active_at, p.created_at,
         p.latitude, p.longitude
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id = _id
    AND (p.is_discoverable OR p.id = auth.uid());
$function$;