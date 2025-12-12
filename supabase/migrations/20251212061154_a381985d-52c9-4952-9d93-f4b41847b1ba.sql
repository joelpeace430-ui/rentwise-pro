-- Add tenant_user_id column to link tenant accounts to tenants table
ALTER TABLE public.tenants ADD COLUMN tenant_user_id UUID REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX idx_tenants_tenant_user_id ON public.tenants(tenant_user_id);

-- Create RLS policy for tenants to view their own data
CREATE POLICY "Tenants can view their own tenant record"
ON public.tenants
FOR SELECT
USING (auth.uid() = tenant_user_id);

-- Create RLS policy for tenants to view their invoices
CREATE POLICY "Tenants can view their own invoices"
ON public.invoices
FOR SELECT
USING (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid()
  )
);

-- Create RLS policy for tenants to view their payments
CREATE POLICY "Tenants can view their own payments"
ON public.payments
FOR SELECT
USING (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid()
  )
);

-- Create RLS policy for tenants to insert payments (for online payments)
CREATE POLICY "Tenants can create their own payments"
ON public.payments
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid()
  )
);

-- Create a table to store magic link tokens for tenant invitations
CREATE TABLE public.tenant_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tenant_invitations
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Landlords can manage invitations for their tenants
CREATE POLICY "Users can manage invitations for their tenants"
ON public.tenant_invitations
FOR ALL
USING (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE user_id = auth.uid()
  )
);

-- Allow public read for valid tokens (for magic link verification)
CREATE POLICY "Anyone can verify valid tokens"
ON public.tenant_invitations
FOR SELECT
USING (
  token IS NOT NULL 
  AND expires_at > now() 
  AND used_at IS NULL
);