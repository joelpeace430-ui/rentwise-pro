
CREATE TABLE public.invoice_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  invoice_day INTEGER NOT NULL DEFAULT 1,
  reminder_days INTEGER[] NOT NULL DEFAULT '{5,10}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_generate_invoices BOOLEAN NOT NULL DEFAULT true,
  auto_send_reminders BOOLEAN NOT NULL DEFAULT true,
  reminder_message_template TEXT DEFAULT 'Hi {tenant_name}, this is a reminder that your rent of KES {amount} (Invoice: {invoice_number}) is due by {due_date}. Please make payment promptly. Thank you! - RentFlow',
  last_invoice_generated_at TIMESTAMP WITH TIME ZONE,
  last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own schedules"
ON public.invoice_schedules FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_invoice_schedules_user ON public.invoice_schedules(user_id);
