-- Ensure a payment can only create one commission entry per recipient
CREATE UNIQUE INDEX IF NOT EXISTS commission_ledger_agent_unique
  ON public.commission_ledger (payment_id, recipient_type, recipient_user_id)
  WHERE recipient_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS commission_ledger_caretaker_unique
  ON public.commission_ledger (payment_id, recipient_type, caretaker_id)
  WHERE caretaker_id IS NOT NULL;

-- Attach the commission-creation function as a trigger on payments.
DROP TRIGGER IF EXISTS trg_create_commission_entries ON public.payments;
CREATE TRIGGER trg_create_commission_entries
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_commission_entries();