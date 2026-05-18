
REVOKE EXECUTE ON FUNCTION public.recalculate_match_points(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_match_score_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_admin_if_empty() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_empty() TO authenticated;
