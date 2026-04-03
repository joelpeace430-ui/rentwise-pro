import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AIInvoiceRequest {
  action: "generate_invoices" | "send_reminder" | "chat";
  tenantIds?: string[];
  tenantId?: string;
  message?: string;
  messages?: Array<{ role: string; content: string }>;
  userId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT from authorization header
    const authHeader = req.headers.get("authorization");
    let authenticatedUserId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      authenticatedUserId = user?.id || null;
    }

    const body: AIInvoiceRequest = await req.json();
    const { action, tenantIds, tenantId, messages, userId } = body;

    // Use authenticated user ID if available, fallback to body userId
    const effectiveUserId = authenticatedUserId || userId;

    if (action === "chat") {
      // AI chat for invoice management assistance
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, first_name, last_name, email, phone, monthly_rent, unit_number, rent_status, property:properties(name)")
        .eq("user_id", effectiveUserId);

      const { data: recentInvoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, due_date, status, tenant_id")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false })
        .limit(20);

      const systemPrompt = `You are RentFlow AI Invoice Assistant. You help landlords manage invoices and tenant communications.

Available tenants: ${JSON.stringify(tenants?.map(t => ({
  id: t.id, name: `${t.first_name} ${t.last_name}`, phone: t.phone, email: t.email,
  rent: t.monthly_rent, unit: t.unit_number, status: t.rent_status, property: (t.property as any)?.name
})) || [])}

Recent invoices: ${JSON.stringify(recentInvoices?.map(i => ({
  id: i.id, number: i.invoice_number, amount: i.amount, due: i.due_date, status: i.status, tenant_id: i.tenant_id
})) || [])}

You can help with:
1. **Generate Invoices**: When asked to create invoices, respond with a JSON action block:
   \`\`\`action
   {"type":"generate_invoices","tenantIds":["id1","id2"],"description":"Monthly rent for July 2025"}
   \`\`\`
2. **Send SMS Reminders**: When asked to send reminders, respond with:
   \`\`\`action
   {"type":"send_reminder","tenantIds":["id1"],"message":"Your rent is due..."}
   \`\`\`
3. **Bulk Operations**: You can generate invoices or send reminders to all tenants or filtered groups.
4. **Invoice Status**: Report on pending, overdue, and paid invoices.

Always confirm before taking actions. Format amounts in KES. Be concise and professional.
When the user says "all tenants" or "everyone", include all tenant IDs from the list above.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...(messages || []),
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Credits exhausted" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI gateway error");
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    if (action === "generate_invoices" && tenantIds && tenantIds.length > 0) {
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, first_name, last_name, monthly_rent, unit_number, property:properties(name)")
        .in("id", tenantIds);

      if (!tenants || tenants.length === 0) {
        return new Response(JSON.stringify({ error: "No tenants found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date();
      const invoices = tenants.map((t, i) => ({
        user_id: effectiveUserId,
        tenant_id: t.id,
        invoice_number: `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(3, "0")}`,
        amount: t.monthly_rent,
        issue_date: now.toISOString().split("T")[0],
        due_date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString().split("T")[0],
        status: "pending",
        description: `Monthly rent - ${t.first_name} ${t.last_name} (${(t.property as any)?.name} ${t.unit_number})`,
      }));

      const { data: created, error } = await supabase
        .from("invoices")
        .insert(invoices)
        .select();

      if (error) {
        console.error("Invoice creation error:", error);
        return new Response(JSON.stringify({ error: "Failed to create invoices" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        count: created?.length || 0,
        invoices: created,
        message: `Successfully created ${created?.length || 0} invoices`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_reminder" && tenantIds && tenantIds.length > 0) {
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, first_name, last_name, phone, monthly_rent, rent_status, unit_number")
        .in("id", tenantIds);

      if (!tenants || tenants.length === 0) {
        return new Response(JSON.stringify({ error: "No tenants found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: Array<{ tenant: string; status: string; error?: string }> = [];

      for (const tenant of tenants) {
        if (!tenant.phone) {
          results.push({ tenant: `${tenant.first_name} ${tenant.last_name}`, status: "skipped", error: "No phone number" });
          continue;
        }

        // Get pending invoices for this tenant
        const { data: pendingInvoices } = await supabase
          .from("invoices")
          .select("amount, due_date, invoice_number")
          .eq("tenant_id", tenant.id)
          .in("status", ["pending", "overdue"])
          .order("due_date", { ascending: true })
          .limit(1);

        const invoice = pendingInvoices?.[0];
        const reminderMsg = body.message || 
          `Hi ${tenant.first_name}, this is a reminder that your rent of KES ${invoice?.amount || tenant.monthly_rent} ${invoice ? `(Invoice: ${invoice.invoice_number}) is due by ${invoice.due_date}` : `is due`}. Please make payment promptly. Thank you! - RentFlow`;

        // Log the SMS
        await supabase.from("sms_logs").insert({
          user_id: effectiveUserId,
          tenant_id: tenant.id,
          message_type: "ai_reminder",
          message_content: reminderMsg,
          phone_number: tenant.phone,
          status: "sent",
        });

        // Try to send via Africa's Talking
        const atApiKey = Deno.env.get("AFRICASTALKING_API_KEY");
        const atUsername = Deno.env.get("AFRICASTALKING_USERNAME");

        if (atApiKey && atUsername) {
          try {
            const smsResponse = await fetch("https://api.africastalking.com/version1/messaging", {
              method: "POST",
              headers: {
                "apiKey": atApiKey,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
              },
              body: new URLSearchParams({
                username: atUsername,
                to: tenant.phone,
                message: reminderMsg,
              }),
            });
            
            if (smsResponse.ok) {
              results.push({ tenant: `${tenant.first_name} ${tenant.last_name}`, status: "sent" });
            } else {
              const errText = await smsResponse.text();
              results.push({ tenant: `${tenant.first_name} ${tenant.last_name}`, status: "failed", error: errText });
            }
          } catch (e) {
            results.push({ tenant: `${tenant.first_name} ${tenant.last_name}`, status: "failed", error: String(e) });
          }
        } else {
          results.push({ tenant: `${tenant.first_name} ${tenant.last_name}`, status: "logged", error: "SMS API not configured, message logged only" });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        results,
        message: `Processed ${results.length} reminder(s)`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI invoice assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
