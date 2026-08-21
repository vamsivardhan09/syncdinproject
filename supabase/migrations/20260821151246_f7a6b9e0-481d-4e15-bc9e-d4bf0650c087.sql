REVOKE ALL ON FUNCTION public.search_people_ranked(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_connections() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_people_ranked(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_my_connections() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated, service_role;