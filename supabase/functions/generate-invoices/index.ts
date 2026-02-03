import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // Only generate invoices on the 1st of each month (or can be triggered manually)
    const isManualTrigger = req.method === "POST";
    
    if (currentDay !== 1 && !isManualTrigger) {
      console.log("Auto invoice generation only runs on the 1st of the month");
      return new Response(
        JSON.stringify({ message: "Auto invoice generation only runs on the 1st of the month" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all active tenants with valid leases
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        monthly_rent,
        unit_number,
        lease_start,
        lease_end,
        property:properties(name)
      `)
      .gte("lease_end", today.toISOString().split("T")[0]);

    if (tenantsError) {
      console.error("Error fetching tenants:", tenantsError);
      throw tenantsError;
    }

    if (!tenants || tenants.length === 0) {
      console.log("No active tenants found");
      return new Response(
        JSON.stringify({ message: "No active tenants found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const invoicePromises = tenants.map(async (tenant) => {
      // Check if invoice already exists for this month
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);

      const { data: existingInvoice } = await supabase
        .from("invoices")
        .select("id")
        .eq("tenant_id", tenant.id)
        .gte("issue_date", monthStart.toISOString().split("T")[0])
        .lte("issue_date", monthEnd.toISOString().split("T")[0])
        .limit(1)
        .single();

      if (existingInvoice) {
        console.log(`Invoice already exists for tenant ${tenant.first_name} ${tenant.last_name} this month`);
        return { tenant: `${tenant.first_name} ${tenant.last_name}`, status: "skipped", reason: "already exists" };
      }

      // Generate invoice number
      const invoiceNumber = `INV-${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;

      // Due date is 10th of the month
      const dueDate = new Date(currentYear, currentMonth, 10);

      const monthName = today.toLocaleDateString("en-KE", { month: "long", year: "numeric" });

      const propertyData = tenant.property as { name: string } | { name: string }[] | null;
      const propertyName = Array.isArray(propertyData) ? propertyData[0]?.name : propertyData?.name;
      
      const { error: insertError } = await supabase
        .from("invoices")
        .insert({
          user_id: tenant.user_id,
          tenant_id: tenant.id,
          invoice_number: invoiceNumber,
          amount: tenant.monthly_rent,
          issue_date: today.toISOString().split("T")[0],
          due_date: dueDate.toISOString().split("T")[0],
          status: "pending",
          description: `Monthly Rent - ${monthName} | ${propertyName} Unit ${tenant.unit_number}`,
        });

      if (insertError) {
        console.error(`Failed to create invoice for ${tenant.first_name}:`, insertError);
        return { tenant: `${tenant.first_name} ${tenant.last_name}`, status: "failed", error: insertError.message };
      }

      // Update tenant rent status to pending
      await supabase
        .from("tenants")
        .update({ rent_status: "pending" })
        .eq("id", tenant.id);

      console.log(`Invoice ${invoiceNumber} created for ${tenant.first_name} ${tenant.last_name}`);
      return { tenant: `${tenant.first_name} ${tenant.last_name}`, status: "created", invoice: invoiceNumber };
    });

    const results = await Promise.all(invoicePromises);
    const createdCount = results.filter((r) => r.status === "created").length;

    console.log(`Generated ${createdCount} invoices`);

    return new Response(
      JSON.stringify({
        message: `Generated ${createdCount} invoices`,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-invoices function:", error);
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
