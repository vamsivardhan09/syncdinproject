UPDATE public.demo_profiles
SET photo_url = 'https://randomuser.me/api/portraits/'
  || CASE WHEN abs(hashtext(slug)) % 2 = 0 THEN 'men' ELSE 'women' END
  || '/' || (abs(hashtext(slug)) % 90)::text || '.jpg'
WHERE photo_url LIKE '%pravatar%';