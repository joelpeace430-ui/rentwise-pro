-- Feature toggle system: admin controls which features are enabled per role
CREATE TABLE public.feature_toggles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, feature_key)
);

ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read toggles (the app needs them to render)
CREATE POLICY "Authenticated users can view feature toggles"
ON public.feature_toggles
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage toggles
CREATE POLICY "Admins can manage feature toggles"
ON public.feature_toggles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_feature_toggles_updated_at
BEFORE UPDATE ON public.feature_toggles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sensible defaults for the controllable features
-- Features: finance, tax, expenses, reports, maintenance
INSERT INTO public.feature_toggles (role, feature_key, enabled) VALUES
  -- Admin: everything on
  ('admin'::app_role, 'finance', true),
  ('admin'::app_role, 'tax', true),
  ('admin'::app_role, 'expenses', true),
  ('admin'::app_role, 'reports', true),
  ('admin'::app_role, 'maintenance', true),
  -- Landlord: everything on
  ('landlord'::app_role, 'finance', true),
  ('landlord'::app_role, 'tax', true),
  ('landlord'::app_role, 'expenses', true),
  ('landlord'::app_role, 'reports', true),
  ('landlord'::app_role, 'maintenance', true),
  -- Finance role: financial features only
  ('finance'::app_role, 'finance', true),
  ('finance'::app_role, 'tax', true),
  ('finance'::app_role, 'expenses', true),
  ('finance'::app_role, 'reports', true),
  ('finance'::app_role, 'maintenance', false),
  -- Agent: limited by default; admin can enable
  ('agent'::app_role, 'finance', true),
  ('agent'::app_role, 'tax', false),
  ('agent'::app_role, 'expenses', false),
  ('agent'::app_role, 'reports', false),
  ('agent'::app_role, 'maintenance', true),
  -- Caretaker: maintenance only
  ('caretaker'::app_role, 'finance', false),
  ('caretaker'::app_role, 'tax', false),
  ('caretaker'::app_role, 'expenses', false),
  ('caretaker'::app_role, 'reports', false),
  ('caretaker'::app_role, 'maintenance', true);