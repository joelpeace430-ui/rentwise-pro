import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const monthStart = `${currentMonth}-01`;
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const monthEnd = nextMonth.toISOString().split("T")[0];

    // Get all tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, user_id, monthly_rent, rent_status");

    if (tenantsError) throw tenantsError;

    let updated = 0;

    for (const tenant of tenants || []) {
      // Get completed payments this month
      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("tenant_id", tenant.id)
        .eq("status", "completed")
        .gte("payment_date", monthStart)
        .lt("payment_date", monthEnd);

      const totalPaid = (payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      const rentOwed = Number(tenant.monthly_rent);

      // Check for overdue invoices
      const { data: overdueInvoices } = await supabase
        .from("invoices")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("status", "pending")
        .lt("due_date", today.toISOString().split("T")[0])
        .limit(1);

      let newStatus: string;
      if (totalPaid >= rentOwed) {
        newStatus = "paid";
      } else if ((overdueInvoices || []).length > 0) {
        newStatus = "overdue";
      } else {
        newStatus = "pending";
      }

      if (newStatus !== tenant.rent_status) {
        await supabase
          .from("tenants")
          .update({ rent_status: newStatus })
          .eq("id", tenant.id);

        // Also update overdue invoices status
        if (newStatus === "overdue") {
          await supabase
            .from("invoices")
            .update({ status: "overdue" })
            .eq("tenant_id", tenant.id)
            .eq("status", "pending")
            .lt("due_date", today.toISOString().split("T")[0]);
        }

        // Mark invoices as paid when tenant fully paid
        if (newStatus === "paid") {
          await supabase
            .from("invoices")
            .update({ status: "paid" })
            .eq("tenant_id", tenant.id)
            .in("status", ["pending", "overdue"])
            .gte("due_date", monthStart)
            .lt("due_date", monthEnd);
        }

        updated++;
      }
    }

    console.log(`Auto rent status: ${updated} tenants updated`);

    return new Response(
      JSON.stringify({ updated }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in auto-rent-status:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
