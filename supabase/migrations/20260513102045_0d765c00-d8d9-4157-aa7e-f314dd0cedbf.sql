
CREATE TABLE public.managed_landlords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  business_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.managed_landlords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage their own managed landlords"
ON public.managed_landlords FOR ALL TO authenticated
USING (auth.uid() = agent_user_id)
WITH CHECK (auth.uid() = agent_user_id);

CREATE POLICY "Admins manage all managed landlords"
ON public.managed_landlords FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_managed_landlords_updated
BEFORE UPDATE ON public.managed_landlords
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.properties
  ADD COLUMN managed_landlord_id UUID REFERENCES public.managed_landlords(id) ON DELETE SET NULL;

CREATE INDEX idx_properties_managed_landlord ON public.properties(managed_landlord_id);
CREATE INDEX idx_managed_landlords_agent ON public.managed_landlords(agent_user_id);
