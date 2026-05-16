
CREATE OR REPLACE FUNCTION public.assign_role_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role text;
BEGIN
  _role := new.raw_user_meta_data ->> 'role';
  IF _role IS NOT NULL AND _role IN ('agent', 'caretaker', 'finance') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, _role::app_role)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'landlord'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN new;
END;
$function$;

DROP POLICY IF EXISTS "No self-assignment of admin or landlord" ON public.user_roles;
CREATE POLICY "No self-assignment of admin or landlord"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  role NOT IN ('admin'::app_role, 'landlord'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Anyone can verify valid tokens" ON public.tenant_invitations;

CREATE OR REPLACE FUNCTION public.validate_invitation_token(_token uuid)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  expires_at timestamptz,
  used_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, tenant_id, expires_at, used_at
  FROM public.tenant_invitations
  WHERE token = _token
    AND expires_at > now()
    AND used_at IS NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.validate_invitation_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Landlords can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their tenant documents" ON storage.objects;

CREATE POLICY "Landlords view their own tenant documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tenant-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.tenants t ON t.id = d.tenant_id
      WHERE storage.objects.name = d.file_url
        AND (t.user_id = auth.uid() OR d.uploaded_by = auth.uid())
    )
  )
);

CREATE POLICY "Landlords upload tenant documents they own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Landlords delete their own tenant documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

UPDATE storage.buckets SET public = false WHERE id = 'expense-receipts';
DROP POLICY IF EXISTS "Public can view expense receipts" ON storage.objects;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_first_name text;
  v_last_name text;
BEGIN
  v_first_name := NULLIF(TRIM(LEFT(new.raw_user_meta_data ->> 'first_name', 100)), '');
  v_last_name := NULLIF(TRIM(LEFT(new.raw_user_meta_data ->> 'last_name', 100)), '');
  BEGIN
    INSERT INTO public.profiles (user_id, email, first_name, last_name)
    VALUES (new.id, new.email, v_first_name, v_last_name);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: profile insert failed: %', SQLERRM;
  END;
  RETURN new;
END;
$function$;
