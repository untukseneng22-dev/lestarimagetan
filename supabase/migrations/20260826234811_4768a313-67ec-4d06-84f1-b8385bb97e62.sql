CREATE TABLE public.market_order_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.market_orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.market_order_events TO authenticated;
GRANT ALL ON public.market_order_events TO service_role;

ALTER TABLE public.market_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read events of visible orders" ON public.market_order_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.market_orders o
    WHERE o.id = market_order_events.order_id
      AND (o.resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "insert events of visible orders" ON public.market_order_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.market_orders o
    WHERE o.id = market_order_events.order_id
      AND (o.resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE INDEX market_order_events_order_idx ON public.market_order_events(order_id, created_at);

ALTER TABLE public.market_orders
  ADD COLUMN proof_url text,
  ADD COLUMN received_at timestamp with time zone,
  ADD COLUMN locked boolean NOT NULL DEFAULT false;

CREATE POLICY "residents finish own orders" ON public.market_orders
  FOR UPDATE TO authenticated
  USING (resident_id = auth.uid() AND locked = false)
  WITH CHECK (resident_id = auth.uid());

UPDATE public.market_orders SET status = 'dibayar' WHERE status = 'dikonfirmasi';
UPDATE public.market_orders SET status = 'diterima', locked = true, received_at = COALESCE(processed_at, now()) WHERE status = 'selesai';
UPDATE public.market_orders SET locked = true WHERE status = 'dibatalkan';

INSERT INTO public.market_order_events (order_id, status, created_at)
SELECT id, 'menunggu', created_at FROM public.market_orders;

INSERT INTO public.market_order_events (order_id, status, created_at)
SELECT id, status, COALESCE(processed_at, updated_at) FROM public.market_orders WHERE status <> 'menunggu';

INSERT INTO public.app_settings (key, value)
VALUES ('market_max_qty_per_product', to_jsonb('5'::text)),
       ('market_max_active_orders', to_jsonb('3'::text))
ON CONFLICT (key) DO NOTHING;