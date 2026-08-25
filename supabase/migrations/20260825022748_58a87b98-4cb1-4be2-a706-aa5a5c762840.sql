CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.app_settings (key, value) VALUES
  ('pickup_schedule', '{"active": true, "days": ["Jumat"], "time": "08.00-12.00", "note": "Penjemputan rutin 1 minggu sekali. Siapkan sampah di depan rumah; bila Anda tidak di rumah, petugas dapat memindai QR yang ditempel di rumah Anda."}'::jsonb),
  ('dropoff_info', '{"address": "Kantor Bank Sampah - Balai Desa", "hours": "Senin-Sabtu, 08.00-15.00", "note": "Warga juga dapat mengantar sampah langsung ke kantor bank sampah pada jam layanan."}'::jsonb);