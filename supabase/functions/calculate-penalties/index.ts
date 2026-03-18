import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(amount);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const africastalkingApiKey = Deno.env.get("AFRICASTALKING_API_KEY");
    const africastalkingUsername = Deno.env.get("AFRICASTALKING_USERNAME");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    // Get all tenants with their property penalty config
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select(`
        id, user_id, first_name, last_name, email, phone, monthly_rent, unit_number,
        property:properties(id, name, penalty_type, penalty_rate, grace_period_days)
      `);

    if (tenantsError) {
      console.error("Error fetching tenants:", tenantsError);
      throw new Error("Failed to fetch tenants");
    }

    let penaltiesApplied = 0;
    let debtsCreated = 0;

    for (const tenant of tenants || []) {
      const property = tenant.property as any;
      if (!property) continue;

      const dueDate = new Date(today.getFullYear(), today.getMonth(), 1); // 1st of current month

      // Check if debt record exists for this month
      const { data: existingDebt } = await supabase
        .from("tenant_debts")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("month_year", currentMonthYear)
        .single();

      // Check payments for this month
      const monthStart = `${currentMonthYear}-01`;
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const monthEnd = nextMonth.toISOString().split("T")[0];

      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("tenant_id", tenant.id)
        .eq("status", "completed")
        .gte("payment_date", monthStart)
        .lt("payment_date", monthEnd);

      const totalPaid = (payments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const rentOwed = Number(tenant.monthly_rent);
      const outstanding = Math.max(0, rentOwed - totalPaid);

      if (!existingDebt) {
        // Create debt record for this month
        const { error: insertError } = await supabase
          .from("tenant_debts")
          .insert({
            tenant_id: tenant.id,
            property_id: property.id,
            user_id: tenant.user_id,
            month_year: currentMonthYear,
            rent_amount: rentOwed,
            amount_paid: totalPaid,
            penalty_amount: 0,
            total_owed: outstanding,
            penalty_rate: Number(property.penalty_rate),
            grace_period_days: property.grace_period_days,
            due_date: monthStart,
            status: outstanding <= 0 ? "paid" : "unpaid",
          });

        if (!insertError) debtsCreated++;
        continue;
      }

      // Update amount paid
      await supabase
        .from("tenant_debts")
        .update({
          amount_paid: totalPaid,
          status: outstanding <= 0 ? "paid" : existingDebt.status,
        })
        .eq("id", existingDebt.id);

      // Check if penalty should be applied
      if (outstanding <= 0) continue; // Fully paid
      if (existingDebt.penalty_applied_at) continue; // Penalty already applied

      const gracePeriodDays = property.grace_period_days || 7;
      const dueDateObj = new Date(existingDebt.due_date);
      const daysSinceDue = Math.floor((today.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceDue <= gracePeriodDays) continue; // Still within grace period

      // Calculate penalty
      let penaltyAmount = 0;
      const penaltyRate = Number(property.penalty_rate) || 5;
      const penaltyType = property.penalty_type || "percentage";

      if (penaltyType === "percentage") {
        penaltyAmount = (outstanding * penaltyRate) / 100;
      } else if (penaltyType === "fixed") {
        penaltyAmount = penaltyRate;
      } else if (penaltyType === "daily") {
        const daysLate = daysSinceDue - gracePeriodDays;
        penaltyAmount = (outstanding * penaltyRate / 100) * daysLate;
      }

      penaltyAmount = Math.round(penaltyAmount);
      const newTotal = outstanding + penaltyAmount;

      // Apply penalty
      const { error: updateError } = await supabase
        .from("tenant_debts")
        .update({
          penalty_amount: penaltyAmount,
          total_owed: newTotal,
          penalty_applied_at: new Date().toISOString(),
          status: "overdue",
          notes: `Penalty of ${formatCurrency(penaltyAmount)} applied (${penaltyType === "percentage" ? `${penaltyRate}%` : penaltyType === "daily" ? `${penaltyRate}%/day` : formatCurrency(penaltyRate)} rate, ${gracePeriodDays}-day grace period exceeded by ${daysSinceDue - gracePeriodDays} days)`,
        })
        .eq("id", existingDebt.id);

      if (updateError) {
        console.error("Failed to apply penalty:", updateError);
        continue;
      }

      penaltiesApplied++;

      // Create in-app notification
      await supabase.from("notifications").insert({
        user_id: tenant.user_id,
        title: "Penalty Applied",
        message: `A penalty of ${formatCurrency(penaltyAmount)} has been applied to ${tenant.first_name} ${tenant.last_name} (Unit ${tenant.unit_number}) for late rent payment. Total owed: ${formatCurrency(newTotal)}.`,
        type: "warning",
        link: "/payments",
      });

      // Send email notification
      if (resendApiKey && tenant.email) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "RentFlow <onboarding@resend.dev>",
              to: [tenant.email],
              subject: `Late Payment Penalty - ${formatCurrency(penaltyAmount)} Applied`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                  <div style="background:#dc2626;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                    <h1 style="color:#fff;margin:0;">Late Payment Penalty Notice</h1>
                  </div>
                  <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
                    <p>Dear ${tenant.first_name} ${tenant.last_name},</p>
                    <p>This is to inform you that a <strong>late payment penalty</strong> has been applied to your account for the month of <strong>${currentMonthYear}</strong>.</p>
                    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Monthly Rent</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;">${formatCurrency(rentOwed)}</td></tr>
                      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Amount Paid</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(totalPaid)}</td></tr>
                      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Outstanding Balance</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(outstanding)}</td></tr>
                      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#dc2626;font-weight:700;">Penalty</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#dc2626;font-weight:700;">${formatCurrency(penaltyAmount)}</td></tr>
                      <tr><td style="padding:8px;font-weight:700;font-size:16px;">Total Owed</td><td style="padding:8px;text-align:right;font-weight:700;font-size:16px;">${formatCurrency(newTotal)}</td></tr>
                    </table>
                    <p>Please settle the outstanding balance at your earliest convenience to avoid further penalties.</p>
                    <p style="color:#6b7280;font-size:12px;">Property: ${property.name} | Unit: ${tenant.unit_number}</p>
                  </div>
                </div>`,
            }),
          });
        } catch (e) {
          console.error("Email notification failed:", e);
        }
      }

      // Send SMS notification
      if (africastalkingApiKey && africastalkingUsername && tenant.phone) {
        try {
          const smsMessage = `RentFlow: A late payment penalty of ${formatCurrency(penaltyAmount)} has been applied to your account. Total owed: ${formatCurrency(newTotal)}. Please pay to avoid further charges.`;
          
          const formData = new URLSearchParams();
          formData.append("username", africastalkingUsername);
          formData.append("to", tenant.phone);
          formData.append("message", smsMessage);

          await fetch("https://api.africastalking.com/version1/messaging", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              apiKey: africastalkingApiKey,
              Accept: "application/json",
            },
            body: formData.toString(),
          });

          // Log SMS
          await supabase.from("sms_logs").insert({
            user_id: tenant.user_id,
            tenant_id: tenant.id,
            phone_number: tenant.phone,
            message_content: smsMessage,
            message_type: "penalty",
            status: "sent",
          });
        } catch (e) {
          console.error("SMS notification failed:", e);
        }
      }
    }

    console.log(`Penalties calculated: ${debtsCreated} debts created, ${penaltiesApplied} penalties applied`);

    return new Response(
      JSON.stringify({ debtsCreated, penaltiesApplied }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in calculate-penalties:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
