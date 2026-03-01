
-- Create maintenance_requests table
CREATE TABLE public.maintenance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  category TEXT NOT NULL DEFAULT 'general',
  image_urls TEXT[] DEFAULT '{}'::text[],
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Landlords can manage all maintenance requests for their properties
CREATE POLICY "Landlords can view maintenance requests"
ON public.maintenance_requests FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Landlords can update maintenance requests"
ON public.maintenance_requests FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Landlords can delete maintenance requests"
ON public.maintenance_requests FOR DELETE
USING (user_id = auth.uid());

-- Tenants can create and view their own maintenance requests
CREATE POLICY "Tenants can create maintenance requests"
ON public.maintenance_requests FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid()
  )
);

CREATE POLICY "Tenants can view their own maintenance requests"
ON public.maintenance_requests FOR SELECT
USING (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_maintenance_requests_updated_at
BEFORE UPDATE ON public.maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);
