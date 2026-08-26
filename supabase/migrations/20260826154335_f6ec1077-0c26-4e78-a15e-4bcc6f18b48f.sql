CREATE TABLE public.market_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Lainnya',
  unit text NOT NULL DEFAULT 'pcs',
  price numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_products TO authenticated;
GRANT ALL ON public.market_products TO service_role;
ALTER TABLE public.market_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read products" ON public.market_products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage products" ON public.market_products
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_market_products_updated_at
  BEFORE UPDATE ON public.market_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.market_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'antar',
  address text,
  shipping_fee numeric NOT NULL DEFAULT 0,
  items_total numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_from_balance numeric NOT NULL DEFAULT 0,
  cash_due numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'menunggu',
  admin_note text,
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.market_orders TO authenticated;
GRANT ALL ON public.market_orders TO service_role;
ALTER TABLE public.market_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "residents read own orders" ON public.market_orders
  FOR SELECT TO authenticated
  USING (resident_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "residents create own orders" ON public.market_orders
  FOR INSERT TO authenticated
  WITH CHECK (resident_id = auth.uid());
CREATE POLICY "admins update orders" ON public.market_orders
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_market_orders_updated_at
  BEFORE UPDATE ON public.market_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.market_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.market_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.market_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  price numeric NOT NULL,
  qty integer NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.market_order_items TO authenticated;
GRANT ALL ON public.market_order_items TO service_role;
ALTER TABLE public.market_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read items of visible orders" ON public.market_order_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.market_orders o
    WHERE o.id = market_order_items.order_id
      AND (o.resident_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));
CREATE POLICY "insert items of own orders" ON public.market_order_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.market_orders o
    WHERE o.id = market_order_items.order_id
      AND (o.resident_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

INSERT INTO public.app_settings (key, value)
VALUES ('market_shipping_fee', '"3000"'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.market_products (name, category, unit, price, stock) VALUES
  ('Beras Premium 5 kg', 'Beras', 'sak', 68000, 25),
  ('Beras Medium 5 kg', 'Beras', 'sak', 58000, 30),
  ('Minyak Goreng 1 L', 'Minyak', 'botol', 17500, 40),
  ('Minyak Goreng 2 L', 'Minyak', 'botol', 34000, 20),
  ('Gula Pasir 1 kg', 'Gula', 'kg', 16000, 35),
  ('Telur Ayam 1 kg', 'Lainnya', 'kg', 28000, 20),
  ('Mi Instan (1 dus isi 40)', 'Lainnya', 'dus', 115000, 10),
  ('Kopi Bubuk 165 g', 'Lainnya', 'bungkus', 12000, 30),
  ('Teh Celup isi 25', 'Lainnya', 'kotak', 8500, 40),
  ('Sabun Mandi Batang', 'Lainnya', 'pcs', 4500, 60);