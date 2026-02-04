import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReceiptRequest {
  paymentId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { paymentId }: ReceiptRequest = await req.json();

    if (!paymentId) {
      throw new Error("Payment ID is required");
    }

    // Get payment details with tenant and property info
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(`
        *,
        tenant:tenants(
          first_name,
          last_name,
          email,
          unit_number,
          property:properties(name, address)
        )
      `)
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      console.error("Payment not found:", paymentError);
      throw new Error("Payment not found");
    }

    // Check if receipt already exists
    const { data: existingReceipt } = await supabase
      .from("receipts")
      .select("id")
      .eq("payment_id", paymentId)
      .single();

    if (existingReceipt) {
      return new Response(
        JSON.stringify({ message: "Receipt already exists", receiptId: existingReceipt.id }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate receipt number
    const timestamp = Date.now();
    const receiptNumber = `RCT-${new Date().getFullYear()}-${String(timestamp).slice(-6)}`;

    // Create receipt record
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .insert({
        user_id: payment.user_id,
        payment_id: paymentId,
        tenant_id: payment.tenant_id,
        receipt_number: receiptNumber,
        amount: payment.amount,
        payment_method: payment.payment_method,
        payment_date: payment.payment_date,
        sent_to_email: payment.tenant?.email,
      })
      .select()
      .single();

    if (receiptError) {
      console.error("Failed to create receipt:", receiptError);
      throw new Error("Failed to create receipt");
    }

    console.log(`Receipt ${receiptNumber} generated for payment ${paymentId}`);

    return new Response(
      JSON.stringify({
        message: "Receipt generated successfully",
        receipt: receipt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-receipt function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
