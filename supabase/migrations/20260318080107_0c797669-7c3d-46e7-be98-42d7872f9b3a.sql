
-- Add penalty configuration columns to properties
ALTER TABLE public.properties 
  ADD COLUMN penalty_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN penalty_rate numeric NOT NULL DEFAULT 5,
  ADD COLUMN grace_period_days integer NOT NULL DEFAULT 7;

-- Create tenant_debts table for tracking accumulated debt and penalties
CREATE TABLE public.tenant_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  month_year text NOT NULL,
  rent_amount numeric NOT NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  penalty_amount numeric NOT NULL DEFAULT 0,
  total_owed numeric NOT NULL DEFAULT 0,
  penalty_rate numeric NOT NULL DEFAULT 0,
  grace_period_days integer NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  penalty_applied_at timestamp with time zone,
  status text NOT NULL DEFAULT 'unpaid',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, month_year)
);

-- Enable RLS
ALTER TABLE public.tenant_debts ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_debts
CREATE POLICY "Users can view their own tenant debts"
  ON public.tenant_debts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tenant debts"
  ON public.tenant_debts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tenant debts"
  ON public.tenant_debts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tenant debts"
  ON public.tenant_debts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Tenants can view their own debts"
  ON public.tenant_debts FOR SELECT
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid()));

-- Enable realtime for tenant_debts
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_debts;
