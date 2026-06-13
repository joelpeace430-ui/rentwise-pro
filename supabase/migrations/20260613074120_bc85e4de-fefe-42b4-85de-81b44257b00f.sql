DROP POLICY IF EXISTS "Tenants can create their own payments" ON public.payments;
CREATE POLICY "Tenants can create their own payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND tenant_id IN (SELECT id FROM public.tenants WHERE tenant_user_id = auth.uid())
  );

CREATE POLICY "Users can update their own receipts"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'expense-receipts' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'expense-receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Landlords update their own tenant documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tenant-documents' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'tenant-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Tenants can read their own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-documents'
    AND EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.tenants t ON t.id = d.tenant_id
      WHERE d.file_url = storage.objects.name
        AND t.tenant_user_id = auth.uid()
    )
  );

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_commission_entries() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_role_on_signup() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated;