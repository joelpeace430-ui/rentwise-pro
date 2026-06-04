
CREATE TABLE public.mpesa_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  shortcode TEXT NOT NULL,
  shortcode_type TEXT NOT NULL DEFAULT 'paybill' CHECK (shortcode_type IN ('paybill','till')),
  consumer_key TEXT NOT NULL,
  consumer_secret TEXT NOT NULL,
  passkey TEXT,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','production')),
  callback_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_registered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mpesa_settings TO authenticated;
GRANT ALL ON public.mpesa_settings TO service_role;

ALTER TABLE public.mpesa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mpesa settings"
  ON public.mpesa_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER mpesa_settings_updated_at
  BEFORE UPDATE ON public.mpesa_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mpesa_settings_shortcode ON public.mpesa_settings(shortcode);
