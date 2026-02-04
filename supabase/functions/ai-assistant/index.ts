import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AIRequest {
  type: "chat" | "payment_score" | "risk_prediction" | "pricing_suggestion";
  messages?: Array<{ role: string; content: string }>;
  tenantId?: string;
  propertyId?: string;
  userId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, messages, tenantId, propertyId, userId }: AIRequest = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "chat") {
      // Tenant chatbot for balance inquiries and maintenance
      systemPrompt = `You are RentFlow AI Assistant, a helpful property management chatbot. You help tenants with:
1. Checking rent balance and payment history
2. Submitting maintenance requests
3. Understanding lease terms
4. General property inquiries

Be friendly, professional, and concise. Format amounts in Kenyan Shillings (KES).
If asked about specific account details you don't have, politely explain you need to look that up and suggest they check their tenant portal.`;

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
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("AI gateway error");
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    if (type === "payment_score" && tenantId) {
      // Calculate payment behavior score
      const { data: payments } = await supabase
        .from("payments")
        .select("payment_date, status, amount")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .order("payment_date", { ascending: false });

      const { data: invoices } = await supabase
        .from("invoices")
        .select("due_date, status, amount")
        .eq("tenant_id", tenantId)
        .order("due_date", { ascending: false });

      // Calculate metrics
      let onTimePayments = 0;
      let latePayments = 0;
      let totalDaysLate = 0;

      if (payments && invoices) {
        for (const payment of payments) {
          const matchingInvoice = invoices.find(inv => 
            Math.abs(inv.amount - payment.amount) < 1
          );
          if (matchingInvoice) {
            const dueDate = new Date(matchingInvoice.due_date);
            const paymentDate = new Date(payment.payment_date);
            const daysLate = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysLate <= 0) {
              onTimePayments++;
            } else {
              latePayments++;
              totalDaysLate += daysLate;
            }
          }
        }
      }

      const totalPayments = onTimePayments + latePayments;
      const averageDaysLate = latePayments > 0 ? totalDaysLate / latePayments : 0;
      
      // Calculate score (0-100)
      let score = 50; // Base score
      if (totalPayments > 0) {
        const onTimeRate = onTimePayments / totalPayments;
        score = Math.round(onTimeRate * 80 + 20); // 20-100 range based on on-time rate
        
        // Penalty for average days late
        score = Math.max(0, score - Math.round(averageDaysLate * 2));
      }

      const riskLevel = score >= 70 ? "low" : score >= 40 ? "medium" : "high";

      // Update or insert score
      const { error: upsertError } = await supabase
        .from("tenant_payment_scores")
        .upsert({
          tenant_id: tenantId,
          payment_score: score,
          risk_level: riskLevel,
          on_time_payments: onTimePayments,
          late_payments: latePayments,
          total_payments: totalPayments,
          average_days_late: averageDaysLate,
          last_calculated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id" });

      if (upsertError) {
        console.error("Failed to save payment score:", upsertError);
      }

      return new Response(
        JSON.stringify({
          score,
          riskLevel,
          onTimePayments,
          latePayments,
          totalPayments,
          averageDaysLate: Math.round(averageDaysLate * 10) / 10,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "risk_prediction" && tenantId) {
      // Get tenant data for AI analysis
      const { data: tenant } = await supabase
        .from("tenants")
        .select("*, tenant_payment_scores(*)")
        .eq("id", tenantId)
        .single();

      const { data: recentPayments } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("payment_date", { ascending: false })
        .limit(6);

      userPrompt = `Analyze this tenant's payment risk:
Tenant: ${tenant?.first_name} ${tenant?.last_name}
Monthly Rent: KES ${tenant?.monthly_rent}
Lease End: ${tenant?.lease_end}
Current Status: ${tenant?.rent_status}
Payment Score: ${tenant?.tenant_payment_scores?.payment_score || 'Not calculated'}
Recent Payments: ${JSON.stringify(recentPayments?.map(p => ({ date: p.payment_date, amount: p.amount, status: p.status })) || [])}

Provide a brief risk assessment with:
1. Risk level (Low/Medium/High)
2. Key risk factors
3. Recommended actions`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a property management AI analyst. Provide concise, actionable risk assessments for landlords." },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("AI gateway error");
      }

      const result = await response.json();
      return new Response(
        JSON.stringify({ analysis: result.choices[0].message.content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "pricing_suggestion" && propertyId) {
      // Get property and market data
      const { data: property } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .single();

      const { data: tenants } = await supabase
        .from("tenants")
        .select("monthly_rent, unit_number")
        .eq("property_id", propertyId);

      const occupiedUnits = tenants?.length || 0;
      const totalUnits = property?.total_units || 1;
      const vacancyRate = ((totalUnits - occupiedUnits) / totalUnits) * 100;
      const tenantsArray = tenants || [];
      const avgRent = tenantsArray.length > 0 
        ? tenantsArray.reduce((sum, t) => sum + Number(t.monthly_rent), 0) / tenantsArray.length 
        : 0;

      userPrompt = `Suggest optimal rent pricing for this property:
Property: ${property?.name}
Address: ${property?.address}
Total Units: ${totalUnits}
Occupied Units: ${occupiedUnits}
Vacancy Rate: ${vacancyRate.toFixed(1)}%
Current Average Rent: KES ${avgRent.toFixed(0)}
Unit Rents: ${JSON.stringify(tenants?.map(t => ({ unit: t.unit_number, rent: t.monthly_rent })) || [])}

Provide:
1. Suggested rent adjustment (increase/decrease/maintain)
2. Recommended rent range (KES)
3. Key factors considered
4. Confidence level (1-100)`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a real estate pricing analyst. Provide data-driven rent pricing suggestions for Kenyan properties." },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("AI gateway error");
      }

      const result = await response.json();
      return new Response(
        JSON.stringify({ 
          suggestion: result.choices[0].message.content,
          vacancyRate,
          currentAvgRent: avgRent,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid request type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
