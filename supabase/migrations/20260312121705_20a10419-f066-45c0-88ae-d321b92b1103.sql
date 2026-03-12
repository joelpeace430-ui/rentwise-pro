
CREATE OR REPLACE FUNCTION public.assign_role_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role text;
BEGIN
  _role := new.raw_user_meta_data ->> 'role';
  IF _role IS NOT NULL AND _role IN ('admin', 'landlord', 'agent', 'caretaker', 'finance') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, _role::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_role_on_signup();
