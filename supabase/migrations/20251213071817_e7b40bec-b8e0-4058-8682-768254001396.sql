-- Create messages table for tenant-landlord communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('tenant', 'landlord')),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Landlords can manage messages for their tenants
CREATE POLICY "Landlords can manage messages for their tenants"
ON public.messages
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

-- Tenants can view their own messages
CREATE POLICY "Tenants can view their own messages"
ON public.messages
FOR SELECT
USING (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid()
  )
);

-- Tenants can create their own messages
CREATE POLICY "Tenants can create their own messages"
ON public.messages
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid()
  )
  AND sender_type = 'tenant'
);

-- Tenants can mark messages as read
CREATE POLICY "Tenants can update message read status"
ON public.messages
FOR UPDATE
USING (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid()
  )
);

-- Create documents table for lease documents and receipts
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('lease', 'receipt', 'notice', 'other')),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Landlords can manage documents for their tenants
CREATE POLICY "Landlords can manage documents for their tenants"
ON public.documents
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

-- Tenants can view their own documents
CREATE POLICY "Tenants can view their own documents"
ON public.documents
FOR SELECT
USING (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid()
  )
);

-- Create storage bucket for tenant documents
INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-documents', 'tenant-documents', false);

-- Storage policies for tenant documents
CREATE POLICY "Landlords can upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'tenant-documents'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their tenant documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'tenant-documents'
  AND auth.uid() IS NOT NULL
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;