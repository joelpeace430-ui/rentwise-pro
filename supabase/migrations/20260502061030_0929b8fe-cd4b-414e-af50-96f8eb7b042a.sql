-- Properties: add location + per-unit default rent
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS rent_per_unit NUMERIC NOT NULL DEFAULT 0;

-- Caretakers: people managed by a landlord (no auth login required)
CREATE TABLE IF NOT EXISTS public.caretakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- landlord/admin owner
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.caretakers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage caretakers"
  ON public.caretakers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all caretakers"
  ON public.caretakers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_caretakers_updated
  BEFORE UPDATE ON public.caretakers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Caretaker assignments: caretaker <-> property, with hybrid commission
CREATE TABLE IF NOT EXISTS public.caretaker_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caretaker_id UUID NOT NULL REFERENCES public.caretakers(id) ON DELETE CASCADE,
  property_id UUID NOT NULL,
  landlord_user_id UUID NOT NULL,
  commission_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed'
  commission_rate NUMERIC NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (caretaker_id, property_id)
);
ALTER TABLE public.caretaker_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage caretaker assignments"
  ON public.caretaker_assignments FOR ALL TO authenticated
  USING (auth.uid() = landlord_user_id)
  WITH CHECK (auth.uid() = landlord_user_id);

CREATE POLICY "Admins manage all caretaker assignments"
  ON public.caretaker_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_caretaker_assignments_updated
  BEFORE UPDATE ON public.caretaker_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Commission ledger: append-only record of earned commissions
CREATE TABLE IF NOT EXISTS public.commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL,
  property_id UUID NOT NULL,
  landlord_user_id UUID NOT NULL,
  recipient_type TEXT NOT NULL, -- 'agent' | 'caretaker'
  recipient_user_id UUID,        -- for agents (auth user id)
  caretaker_id UUID,             -- for caretakers
  payment_amount NUMERIC NOT NULL,
  commission_type TEXT NOT NULL,
  commission_rate NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords view their commission ledger"
  ON public.commission_ledger FOR SELECT TO authenticated
  USING (auth.uid() = landlord_user_id);

CREATE POLICY "Landlords update their commission ledger"
  ON public.commission_ledger FOR UPDATE TO authenticated
  USING (auth.uid() = landlord_user_id);

CREATE POLICY "Landlords insert their commission ledger"
  ON public.commission_ledger FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = landlord_user_id);

CREATE POLICY "Agents view their own commissions"
  ON public.commission_ledger FOR SELECT TO authenticated
  USING (recipient_type = 'agent' AND auth.uid() = recipient_user_id);

CREATE POLICY "Admins manage all commission ledger"
  ON public.commission_ledger FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Utility bills: add due_date for billing cycle clarity
ALTER TABLE public.utility_bills
  ADD COLUMN IF NOT EXISTS due_date DATE;

-- Trigger: auto-create commission ledger entries when a payment is completed
CREATE OR REPLACE FUNCTION public.create_commission_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id UUID;
  v_landlord UUID;
  rec RECORD;
  v_amount NUMERIC;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;

  SELECT t.property_id, t.user_id INTO v_property_id, v_landlord
  FROM public.tenants t WHERE t.id = NEW.tenant_id;
  IF v_property_id IS NULL THEN RETURN NEW; END IF;

  -- Agent commissions
  FOR rec IN
    SELECT * FROM public.agent_commissions WHERE property_id = v_property_id
  LOOP
    v_amount := CASE WHEN rec.commission_type = 'fixed'
                     THEN rec.commission_rate
                     ELSE NEW.amount * rec.commission_rate / 100 END;
    INSERT INTO public.commission_ledger
      (payment_id, property_id, landlord_user_id, recipient_type, recipient_user_id,
       payment_amount, commission_type, commission_rate, commission_amount)
    VALUES (NEW.id, v_property_id, v_landlord, 'agent', rec.agent_user_id,
            NEW.amount, rec.commission_type, rec.commission_rate, v_amount)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Caretaker commissions
  FOR rec IN
    SELECT * FROM public.caretaker_assignments WHERE property_id = v_property_id
  LOOP
    v_amount := CASE WHEN rec.commission_type = 'fixed'
                     THEN rec.commission_rate
                     ELSE NEW.amount * rec.commission_rate / 100 END;
    INSERT INTO public.commission_ledger
      (payment_id, property_id, landlord_user_id, recipient_type, caretaker_id,
       payment_amount, commission_type, commission_rate, commission_amount)
    VALUES (NEW.id, v_property_id, v_landlord, 'caretaker', rec.caretaker_id,
            NEW.amount, rec.commission_type, rec.commission_rate, v_amount)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_commission_insert ON public.payments;
CREATE TRIGGER trg_payment_commission_insert
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.create_commission_entries();

DROP TRIGGER IF EXISTS trg_payment_commission_update ON public.payments;
CREATE TRIGGER trg_payment_commission_update
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.create_commission_entries();