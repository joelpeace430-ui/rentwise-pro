
-- Agent commissions table
CREATE TABLE public.agent_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  landlord_user_id UUID NOT NULL,
  commission_type TEXT NOT NULL DEFAULT 'percentage',
  commission_rate NUMERIC NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agent_user_id, property_id)
);

ALTER TABLE public.agent_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own commissions"
  ON public.agent_commissions FOR SELECT
  TO authenticated
  USING (auth.uid() = agent_user_id);

CREATE POLICY "Admins can manage all commissions"
  ON public.agent_commissions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Landlords can manage commissions for their properties"
  ON public.agent_commissions FOR ALL
  TO authenticated
  USING (auth.uid() = landlord_user_id)
  WITH CHECK (auth.uid() = landlord_user_id);

-- Utility bills table
CREATE TABLE public.utility_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  utility_type TEXT NOT NULL,
  billing_period TEXT NOT NULL,
  usage_amount NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.utility_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own utility bills"
  ON public.utility_bills FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agents can view utility bills for assigned properties"
  ON public.utility_bills FOR SELECT
  TO authenticated
  USING (property_id IN (
    SELECT property_id FROM public.agent_commissions WHERE agent_user_id = auth.uid()
  ));

CREATE POLICY "Tenants can view their own utility bills"
  ON public.utility_bills FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid()
  ));

-- Add agent_commissions to properties RLS so agents can view assigned properties
CREATE POLICY "Agents can view assigned properties"
  ON public.properties FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT property_id FROM public.agent_commissions WHERE agent_user_id = auth.uid()
  ));

-- Agents can view tenants of assigned properties
CREATE POLICY "Agents can view tenants of assigned properties"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (property_id IN (
    SELECT property_id FROM public.agent_commissions WHERE agent_user_id = auth.uid()
  ));

-- Agents can view payments of tenants in assigned properties
CREATE POLICY "Agents can view payments for assigned properties"
  ON public.payments FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT id FROM public.tenants WHERE property_id IN (
      SELECT property_id FROM public.agent_commissions WHERE agent_user_id = auth.uid()
    )
  ));

-- Agents can view invoices for assigned properties
CREATE POLICY "Agents can view invoices for assigned properties"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT id FROM public.tenants WHERE property_id IN (
      SELECT property_id FROM public.agent_commissions WHERE agent_user_id = auth.uid()
    )
  ));

-- Agents can view maintenance for assigned properties
CREATE POLICY "Agents can view maintenance for assigned properties"
  ON public.maintenance_requests FOR SELECT
  TO authenticated
  USING (property_id IN (
    SELECT property_id FROM public.agent_commissions WHERE agent_user_id = auth.uid()
  ));
