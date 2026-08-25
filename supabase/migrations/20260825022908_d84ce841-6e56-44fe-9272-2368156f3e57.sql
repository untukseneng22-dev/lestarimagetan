CREATE OR REPLACE FUNCTION public.monthly_leaderboard(limit_n int DEFAULT 5)
RETURNS TABLE(resident_id uuid, full_name text, total_weight numeric, total_amount numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.resident_id, p.full_name,
         SUM(t.total_weight)::numeric AS total_weight,
         SUM(t.total_amount)::numeric AS total_amount
  FROM public.transactions t
  JOIN public.profiles p ON p.id = t.resident_id
  WHERE t.deposit_date >= date_trunc('month', CURRENT_DATE)::date
  GROUP BY t.resident_id, p.full_name
  ORDER BY SUM(t.total_weight) DESC, SUM(t.total_amount) DESC
  LIMIT limit_n;
$$;
REVOKE EXECUTE ON FUNCTION public.monthly_leaderboard(int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.monthly_leaderboard(int) TO authenticated;