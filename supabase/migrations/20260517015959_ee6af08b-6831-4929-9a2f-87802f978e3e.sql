-- Lock down SECURITY DEFINER functions: only postgres/internal triggers call them
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Restrict bucket listing: only allow reading specific files, not listing
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Avatar files are publicly readable by direct URL"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'anon'
    AND name IS NOT NULL
  );

CREATE POLICY "Authenticated users can view all avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');