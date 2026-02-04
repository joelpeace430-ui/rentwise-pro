-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'landlord', 'agent', 'caretaker');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_properties UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(role)
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Landlords can assign agent and caretaker roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'landlord') 
  AND role IN ('agent', 'caretaker')
);

-- Create receipts table
CREATE TABLE public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    receipt_number TEXT NOT NULL UNIQUE,
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    payment_date DATE NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    sent_to_email TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on receipts
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies for receipts
CREATE POLICY "Users can view their own receipts"
ON public.receipts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create receipts"
ON public.receipts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenants can view their own receipts"
ON public.receipts
FOR SELECT
USING (tenant_id IN (
    SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid()
));

-- Create tenant_payment_scores table for AI scoring
CREATE TABLE public.tenant_payment_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
    payment_score INTEGER DEFAULT 50 CHECK (payment_score >= 0 AND payment_score <= 100),
    risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
    on_time_payments INTEGER DEFAULT 0,
    late_payments INTEGER DEFAULT 0,
    total_payments INTEGER DEFAULT 0,
    average_days_late NUMERIC DEFAULT 0,
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payment scores
ALTER TABLE public.tenant_payment_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment scores
CREATE POLICY "Users can view their tenant scores"
ON public.tenant_payment_scores
FOR SELECT
USING (tenant_id IN (
    SELECT id FROM public.tenants WHERE user_id = auth.uid()
));

CREATE POLICY "Users can manage their tenant scores"
ON public.tenant_payment_scores
FOR ALL
USING (tenant_id IN (
    SELECT id FROM public.tenants WHERE user_id = auth.uid()
))
WITH CHECK (tenant_id IN (
    SELECT id FROM public.tenants WHERE user_id = auth.uid()
));

-- Create AI chat history table
CREATE TABLE public.ai_chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on AI chat
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for AI chat
CREATE POLICY "Users can manage their own chat history"
ON public.ai_chat_history
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenants can manage their own chat"
ON public.ai_chat_history
FOR ALL
USING (tenant_id IN (
    SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid()
))
WITH CHECK (tenant_id IN (
    SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid()
));

-- Create smart pricing suggestions table
CREATE TABLE public.pricing_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    unit_number TEXT,
    current_rent NUMERIC NOT NULL,
    suggested_rent NUMERIC NOT NULL,
    vacancy_rate NUMERIC,
    market_analysis TEXT,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pricing suggestions
ALTER TABLE public.pricing_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies for pricing suggestions
CREATE POLICY "Users can view their pricing suggestions"
ON public.pricing_suggestions
FOR SELECT
USING (property_id IN (
    SELECT id FROM public.properties WHERE user_id = auth.uid()
));

CREATE POLICY "Users can manage their pricing suggestions"
ON public.pricing_suggestions
FOR ALL
USING (property_id IN (
    SELECT id FROM public.properties WHERE user_id = auth.uid()
))
WITH CHECK (property_id IN (
    SELECT id FROM public.properties WHERE user_id = auth.uid()
));

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_payment_scores_updated_at
BEFORE UPDATE ON public.tenant_payment_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();