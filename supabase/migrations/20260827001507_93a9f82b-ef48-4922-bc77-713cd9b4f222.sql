REVOKE EXECUTE ON FUNCTION public.monthly_leaderboard(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monthly_leaderboard(integer) TO service_role;