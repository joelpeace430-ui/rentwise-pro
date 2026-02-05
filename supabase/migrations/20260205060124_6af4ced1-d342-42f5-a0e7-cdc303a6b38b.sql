-- Create storage bucket for maintenance images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('maintenance-images', 'maintenance-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Tenants can upload their own maintenance images
CREATE POLICY "Tenants can upload maintenance images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'maintenance-images' 
  AND auth.uid() IS NOT NULL
);

-- Storage policy: Anyone can view maintenance images (landlords need to see them)
CREATE POLICY "Anyone can view maintenance images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'maintenance-images');

-- Storage policy: Owners can delete their own maintenance images
CREATE POLICY "Users can delete their own maintenance images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'maintenance-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add image_urls column to messages table for maintenance photos
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

-- Add message_type column to differentiate between regular messages and maintenance requests
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'general';

-- Add phone column to tenants if not exists for SMS reminders
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS phone text;