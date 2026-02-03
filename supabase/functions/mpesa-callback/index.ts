import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MPesaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value?: string | number;
        }>;
      };
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const callback: MPesaCallback = await req.json();
    const { stkCallback } = callback.Body;

    console.log('M-Pesa Callback received:', JSON.stringify(stkCallback, null, 2));

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    
    // Find the payment by CheckoutRequestID in notes
    const { data: payments, error: findError } = await supabase
      .from('payments')
      .select('*')
      .ilike('notes', `%${checkoutRequestId}%`)
      .eq('status', 'processing')
      .limit(1);

    if (findError || !payments || payments.length === 0) {
      console.error('Payment not found for CheckoutRequestID:', checkoutRequestId);
      // Still return success to M-Pesa to acknowledge receipt
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payment = payments[0];

    if (stkCallback.ResultCode === 0) {
      // Payment successful
      const metadata = stkCallback.CallbackMetadata?.Item || [];
      const mpesaReceiptNumber = metadata.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
      const transactionDate = metadata.find(i => i.Name === 'TransactionDate')?.Value;
      const phoneNumber = metadata.find(i => i.Name === 'PhoneNumber')?.Value;

      const updatedNotes = `M-Pesa Receipt: ${mpesaReceiptNumber} | Phone: ${phoneNumber} | Date: ${transactionDate}`;

      // Update payment status to completed
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          notes: updatedNotes,
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('Error updating payment:', updateError);
      }

      // If linked to an invoice, update invoice status
      if (payment.invoice_id) {
        await supabase
          .from('invoices')
          .update({ status: 'paid' })
          .eq('id', payment.invoice_id);
      }

      console.log('Payment completed successfully:', payment.id);
    } else {
      // Payment failed
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'failed',
          notes: `${payment.notes} | Failed: ${stkCallback.ResultDesc}`,
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('Error updating failed payment:', updateError);
      }

      console.log('Payment failed:', stkCallback.ResultDesc);
    }

    // Return success to M-Pesa
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Callback processing error:', error);
    // Still return success to prevent retries
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
