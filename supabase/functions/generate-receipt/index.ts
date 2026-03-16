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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(amount);

const generateReceiptHTML = (receipt: any, payment: any) => {
  const tenant = payment.tenant;
  const property = tenant?.property;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#18181b;padding:32px 40px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">Payment Receipt</h1>
      <p style="color:#a1a1aa;margin:8px 0 0;font-size:14px;">${receipt.receipt_number}</p>
    </div>
    <div style="padding:32px 40px;">
      <p style="color:#52525b;font-size:14px;margin:0 0 24px;">Dear ${tenant?.first_name} ${tenant?.last_name},</p>
      <p style="color:#52525b;font-size:14px;margin:0 0 24px;">Your payment has been received and confirmed. Below are the details:</p>
      
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;color:#71717a;font-size:13px;">Amount Paid</td>
          <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;text-align:right;font-weight:700;font-size:18px;color:#18181b;">${formatCurrency(payment.amount)}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;color:#71717a;font-size:13px;">Payment Method</td>
          <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;text-align:right;color:#18181b;font-size:14px;">${payment.payment_method === 'mpesa' ? 'M-Pesa' : payment.payment_method.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;color:#71717a;font-size:13px;">Payment Date</td>
          <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;text-align:right;color:#18181b;font-size:14px;">${new Date(payment.payment_date).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;color:#71717a;font-size:13px;">Property</td>
          <td style="padding:12px 0;border-bottom:1px solid #e4e4e7;text-align:right;color:#18181b;font-size:14px;">${property?.name || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#71717a;font-size:13px;">Unit</td>
          <td style="padding:12px 0;text-align:right;color:#18181b;font-size:14px;">${tenant?.unit_number || 'N/A'}</td>
        </tr>
      </table>

      <div style="background:#f4f4f5;border-radius:8px;padding:16px 20px;text-align:center;margin:0 0 24px;">
        <p style="color:#22c55e;font-weight:700;font-size:14px;margin:0;">✓ Payment Confirmed</p>
      </div>

      <p style="color:#a1a1aa;font-size:12px;margin:0;text-align:center;">This is an automated receipt. Please keep it for your records.</p>
    </div>
  </div>
</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { paymentId }: ReceiptRequest = await req.json();

    if (!paymentId) {
      throw new Error("Payment ID is required");
    }

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

    // Send receipt email via Resend
    let emailSent = false;
    if (resendApiKey && payment.tenant?.email) {
      try {
        const html = generateReceiptHTML(receipt, payment);
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Rent Receipts <onboarding@resend.dev>",
            to: [payment.tenant.email],
            subject: `Payment Receipt ${receiptNumber} - ${formatCurrency(payment.amount)}`,
            html,
          }),
        });

        if (emailRes.ok) {
          emailSent = true;
          await supabase
            .from("receipts")
            .update({ sent_at: new Date().toISOString() })
            .eq("id", receipt.id);
          console.log(`Receipt email sent to ${payment.tenant.email}`);
        } else {
          const errBody = await emailRes.text();
          console.error("Resend error:", errBody);
        }
      } catch (emailErr) {
        console.error("Failed to send receipt email:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Receipt generated successfully",
        receipt,
        emailSent,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in generate-receipt function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
