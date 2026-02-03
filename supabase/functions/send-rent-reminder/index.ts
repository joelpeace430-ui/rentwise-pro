import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const currentDay = today.getDate();

    // Send reminders on the 1st, 5th, and 10th of each month for unpaid rent
    const reminderDays = [1, 5, 10];
    
    if (!reminderDays.includes(currentDay)) {
      console.log("No rent reminders scheduled for today");
      return new Response(
        JSON.stringify({ message: "No rent reminders scheduled for today" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all tenants with pending or overdue rent
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select(`
        id,
        first_name,
        last_name,
        email,
        monthly_rent,
        rent_status,
        unit_number,
        property:properties(name, address),
        user_id
      `)
      .in("rent_status", ["pending", "overdue"]);

    if (tenantsError) {
      console.error("Error fetching tenants:", tenantsError);
      throw tenantsError;
    }

    if (!tenants || tenants.length === 0) {
      console.log("No tenants with unpaid rent");
      return new Response(
        JSON.stringify({ message: "No tenants with unpaid rent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check for pending invoices for each tenant
    const emailPromises = tenants.map(async (tenant) => {
      if (!tenant.email) return null;

      // Get the latest pending/overdue invoice for this tenant
      const { data: invoice } = await supabase
        .from("invoices")
        .select("*")
        .eq("tenant_id", tenant.id)
        .in("status", ["pending", "overdue"])
        .order("due_date", { ascending: true })
        .limit(1)
        .single();

      if (!invoice) return null;

      const propertyData = tenant.property as { name: string; address: string } | { name: string; address: string }[] | null;
      const propertyName = Array.isArray(propertyData) ? propertyData[0]?.name : propertyData?.name;
      
      const isOverdue = tenant.rent_status === "overdue";
      const urgencyText = isOverdue ? "OVERDUE" : "Due Soon";
      const daysOverdue = isOverdue 
        ? Math.floor((today.getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      try {
        const emailResponse = await resend.emails.send({
          from: "RentFlow <onboarding@resend.dev>",
          to: [tenant.email],
          subject: isOverdue 
            ? `⚠️ Rent Payment Overdue - ${formatCurrency(tenant.monthly_rent)}`
            : `Rent Payment Reminder - ${formatCurrency(tenant.monthly_rent)}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: ${isOverdue ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">${urgencyText}: Rent Payment</h1>
              </div>
              
              <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p>Hello ${tenant.first_name} ${tenant.last_name},</p>
                
                ${isOverdue 
                  ? `<p style="color: #dc2626; font-weight: bold;">Your rent payment is ${daysOverdue} days overdue. Please make your payment immediately to avoid late fees and potential lease violations.</p>`
                  : `<p>This is a friendly reminder that your rent payment is due soon.</p>`
                }
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #1a1a2e;">Payment Details:</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Property:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${propertyName || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Unit:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${tenant.unit_number}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Amount Due:</td>
                      <td style="padding: 8px 0; font-weight: bold; color: ${isOverdue ? '#dc2626' : '#16a34a'};">${formatCurrency(tenant.monthly_rent)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Due Date:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${new Date(invoice.due_date).toLocaleDateString('en-KE', { dateStyle: 'long' })}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Invoice #:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${invoice.invoice_number}</td>
                    </tr>
                  </table>
                </div>
                
                <p>You can pay via M-Pesa or through your tenant portal.</p>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                  If you have already made this payment, please disregard this reminder. For any questions, please contact your property manager.
                </p>
              </div>
            </div>
          `,
        });

        console.log(`Rent reminder sent to ${tenant.email}:`, emailResponse);
        return { email: tenant.email, status: "sent", tenant: `${tenant.first_name} ${tenant.last_name}` };
      } catch (emailError) {
        console.error(`Failed to send reminder to ${tenant.email}:`, emailError);
        return { email: tenant.email, status: "failed", error: emailError };
      }
    });

    const results = await Promise.all(emailPromises);
    const sentResults = results.filter((r) => r?.status === "sent");

    console.log(`Sent ${sentResults.length} rent reminder emails`);

    return new Response(
      JSON.stringify({
        message: `Sent ${sentResults.length} rent reminder emails`,
        results: results.filter(Boolean),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-rent-reminder function:", error);
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
