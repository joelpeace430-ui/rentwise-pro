import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthYear = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

    // Get all active schedules
    const { data: schedules, error: schedError } = await supabase
      .from("invoice_schedules")
      .select("*")
      .eq("is_active", true);

    if (schedError) {
      console.error("Error fetching schedules:", schedError);
      throw new Error("Failed to fetch schedules");
    }

    const results: Array<{ userId: string; action: string; details: string }> = [];

    for (const schedule of schedules || []) {
      // AUTO-GENERATE INVOICES
      if (schedule.auto_generate_invoices && currentDay === schedule.invoice_day) {
        // Check if already generated this month
        const lastGen = schedule.last_invoice_generated_at
          ? new Date(schedule.last_invoice_generated_at)
          : null;
        const alreadyGenerated = lastGen &&
          lastGen.getMonth() === currentMonth &&
          lastGen.getFullYear() === currentYear;

        if (!alreadyGenerated) {
          // Get all tenants for this user
          const { data: tenants } = await supabase
            .from("tenants")
            .select("id, first_name, last_name, monthly_rent, unit_number, property_id, property:properties(name)")
            .eq("user_id", schedule.user_id);

          if (tenants && tenants.length > 0) {
            const dueDate = new Date(currentYear, currentMonth, 10);
            const invoices = tenants.map((t, i) => ({
              user_id: schedule.user_id,
              tenant_id: t.id,
              invoice_number: `INV-${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(i + 1).padStart(3, "0")}`,
              amount: t.monthly_rent,
              issue_date: today.toISOString().split("T")[0],
              due_date: dueDate.toISOString().split("T")[0],
              status: "pending",
              description: `Monthly rent - ${t.first_name} ${t.last_name} (${(t.property as any)?.name} ${t.unit_number})`,
            }));

            const { data: created, error: invError } = await supabase
              .from("invoices")
              .insert(invoices)
              .select();

            if (invError) {
              console.error("Invoice creation error:", invError);
              results.push({ userId: schedule.user_id, action: "generate_invoices", details: `Failed: ${invError.message}` });
            } else {
              // Update last generated timestamp
              await supabase
                .from("invoice_schedules")
                .update({ last_invoice_generated_at: new Date().toISOString() })
                .eq("id", schedule.id);

              results.push({
                userId: schedule.user_id,
                action: "generate_invoices",
                details: `Created ${created?.length || 0} invoices for ${monthYear}`,
              });
            }
          }
        }
      }

      // AUTO-SEND REMINDERS
      if (schedule.auto_send_reminders && (schedule.reminder_days as number[]).includes(currentDay)) {
        // Check if already sent today
        const lastSent = schedule.last_reminder_sent_at
          ? new Date(schedule.last_reminder_sent_at)
          : null;
        const alreadySent = lastSent &&
          lastSent.getDate() === currentDay &&
          lastSent.getMonth() === currentMonth &&
          lastSent.getFullYear() === currentYear;

        if (!alreadySent) {
          // Get tenants with pending/overdue invoices
          const { data: pendingInvoices } = await supabase
            .from("invoices")
            .select("id, invoice_number, amount, due_date, tenant_id, tenant:tenants(id, first_name, last_name, phone)")
            .eq("user_id", schedule.user_id)
            .in("status", ["pending", "overdue"]);

          if (pendingInvoices && pendingInvoices.length > 0) {
            const atApiKey = Deno.env.get("AFRICASTALKING_API_KEY");
            const atUsername = Deno.env.get("AFRICASTALKING_USERNAME");
            let sentCount = 0;

            for (const inv of pendingInvoices) {
              const tenant = inv.tenant as any;
              if (!tenant?.phone) continue;

              // Build message from template
              let message = schedule.reminder_message_template || 
                "Hi {tenant_name}, your rent of KES {amount} is due by {due_date}. Please pay promptly. - RentFlow";
              message = message
                .replace("{tenant_name}", `${tenant.first_name}`)
                .replace("{amount}", String(inv.amount))
                .replace("{invoice_number}", inv.invoice_number)
                .replace("{due_date}", inv.due_date);

              // Log SMS
              await supabase.from("sms_logs").insert({
                user_id: schedule.user_id,
                tenant_id: tenant.id,
                message_type: "auto_reminder",
                message_content: message,
                phone_number: tenant.phone,
                status: atApiKey ? "sending" : "logged",
              });

              // Send via Africa's Talking if configured
              if (atApiKey && atUsername) {
                try {
                  const smsResponse = await fetch("https://api.africastalking.com/version1/messaging", {
                    method: "POST",
                    headers: {
                      apiKey: atApiKey,
                      "Content-Type": "application/x-www-form-urlencoded",
                      Accept: "application/json",
                    },
                    body: new URLSearchParams({
                      username: atUsername,
                      to: tenant.phone,
                      message,
                    }),
                  });
                  if (smsResponse.ok) sentCount++;
                } catch (e) {
                  console.error("SMS send error:", e);
                }
              } else {
                sentCount++;
              }
            }

            // Update last sent timestamp
            await supabase
              .from("invoice_schedules")
              .update({ last_reminder_sent_at: new Date().toISOString() })
              .eq("id", schedule.id);

            results.push({
              userId: schedule.user_id,
              action: "send_reminders",
              details: `Sent ${sentCount} reminders for ${pendingInvoices.length} pending invoices`,
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results, date: today.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auto scheduler error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
