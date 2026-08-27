DROP POLICY IF EXISTS "authenticated can read profiles" ON public.profiles;
CREATE POLICY "read own or staff reads profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'tim')
);

CREATE OR REPLACE FUNCTION public.guard_resident_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.resident_id IS DISTINCT FROM OLD.resident_id
     OR NEW.method IS DISTINCT FROM OLD.method
     OR NEW.address IS DISTINCT FROM OLD.address
     OR NEW.shipping_fee IS DISTINCT FROM OLD.shipping_fee
     OR NEW.items_total IS DISTINCT FROM OLD.items_total
     OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
     OR NEW.paid_from_balance IS DISTINCT FROM OLD.paid_from_balance
     OR NEW.cash_due IS DISTINCT FROM OLD.cash_due
     OR NEW.admin_note IS DISTINCT FROM OLD.admin_note
     OR NEW.processed_by IS DISTINCT FROM OLD.processed_by
     OR NEW.processed_at IS DISTINCT FROM OLD.processed_at
     OR NEW.locked IS DISTINCT FROM OLD.locked
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Warga tidak boleh mengubah rincian pesanan';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'selesai' THEN
    RAISE EXCEPTION 'Warga hanya dapat menandai pesanan selesai';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_resident_order_update ON public.market_orders;
CREATE TRIGGER guard_resident_order_update
BEFORE UPDATE ON public.market_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_resident_order_update();

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_resident_order_update() FROM PUBLIC, anon, authenticated;