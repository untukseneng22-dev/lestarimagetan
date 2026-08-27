ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamp with time zone NOT NULL DEFAULT now();

GRANT UPDATE ON public.notification_logs TO authenticated;

CREATE POLICY "admins update notification logs"
ON public.notification_logs
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));