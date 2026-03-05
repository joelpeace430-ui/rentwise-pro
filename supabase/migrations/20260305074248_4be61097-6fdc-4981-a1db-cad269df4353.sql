-- Allow admins to view all profiles for user management
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all user roles
-- (existing policy uses has_role already, but let's ensure SELECT specifically)
