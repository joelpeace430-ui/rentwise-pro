
-- Remove commission ledger entries from test payments
DELETE FROM public.commission_ledger
 WHERE payment_id IN (
   SELECT id FROM public.payments WHERE notes LIKE '%TESTFULL001%' OR notes LIKE '%TESTPART001%' OR notes LIKE '%TESTPART002%'
 );

-- Remove receipts linked to test payments
DELETE FROM public.receipts
 WHERE payment_id IN (
   SELECT id FROM public.payments WHERE notes LIKE '%TESTFULL001%' OR notes LIKE '%TESTPART001%' OR notes LIKE '%TESTPART002%'
 );

-- Remove test payments
DELETE FROM public.payments WHERE notes LIKE '%TESTFULL001%' OR notes LIKE '%TESTPART001%' OR notes LIKE '%TESTPART002%';

-- Remove debt rows auto-created or manually inserted during the test
DELETE FROM public.tenant_debts WHERE month_year='2026-06' AND tenant_id IN ('55f6bfc6-5bd8-4576-a2bb-faaeb056a253','460948df-4453-487e-b5d9-db52faa74581');

-- Remove test agent & caretaker assignments
DELETE FROM public.agent_commissions
 WHERE agent_user_id='9fa47fd4-747c-483b-a8de-2915cffcdbc8'
   AND property_id IN ('5d1ad237-5d81-4824-84e2-6266a5af54d4','79ff2403-3f6e-464c-abf4-b2e519ff10df');

DELETE FROM public.caretaker_assignments
 WHERE caretaker_id='873854ac-2a72-471b-8bc4-e6e31102189c'
   AND property_id IN ('5d1ad237-5d81-4824-84e2-6266a5af54d4','79ff2403-3f6e-464c-abf4-b2e519ff10df');

-- Remove the test M-Pesa shortcode
DELETE FROM public.mpesa_settings WHERE shortcode='TESTGRP' AND callback_secret='testsecret123';

-- Reset tenant rent statuses changed during the test
UPDATE public.tenants SET rent_status='pending' WHERE id IN ('55f6bfc6-5bd8-4576-a2bb-faaeb056a253','460948df-4453-487e-b5d9-db52faa74581');

-- Mark invoices that were flipped to paid by test back to overdue (only those without remaining valid payments)
UPDATE public.invoices SET status='overdue'
 WHERE tenant_id IN ('55f6bfc6-5bd8-4576-a2bb-faaeb056a253','460948df-4453-487e-b5d9-db52faa74581')
   AND status='paid'
   AND id NOT IN (SELECT invoice_id FROM public.payments WHERE invoice_id IS NOT NULL AND status='completed');
