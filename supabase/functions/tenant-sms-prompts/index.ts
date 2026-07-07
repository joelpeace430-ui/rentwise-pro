import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

interface SMSRequest {
  tenantId: string;
  messageType: "payment_prompt" | "receipt_request" | "balance_inquiry" | "lease_reminder" | "help" | "custom";
  customMessage?: string;
}

const prettyUtility = (t: string) =>
  t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatUtilities = (utils: Array<{ utility_type: string; total_amount: number; billing_period: string }>) => {
  if (!utils || utils.length === 0) return { line: "", total: 0 };
  const total = utils.reduce((s, u) => s + Number(u.total_amount), 0);
  const parts = utils.map((u) => `${prettyUtility(u.utility_type)} ${formatCurrency(Number(u.total_amount))}`);
  return { line: `\n\nAmenities due: ${parts.join(", ")}\nAmenities Total: ${formatCurrency(total)}`, total };
};

const generateMessage = (
  type: string,
  tenant: any,
  invoiceData?: any,
  receiptData?: any,
  utilities?: Array<{ utility_type: string; total_amount: number; billing_period: string }>,
): string => {
  const name = tenant.first_name;
  const propertyName = Array.isArray(tenant.property) ? tenant.property[0]?.name : tenant.property?.name;
  const unit = tenant.unit_number;
  const util = formatUtilities(utilities || []);

  switch (type) {
    case "payment_prompt":
      if (invoiceData) {
        const grand = Number(invoiceData.amount) + util.total;
        return `Hi ${name}, your rent of ${formatCurrency(invoiceData.amount)} for ${propertyName} Unit ${unit} is due on ${new Date(invoiceData.due_date).toLocaleDateString("en-KE", { dateStyle: "medium" })}.${util.line}\n\nGrand Total Due: ${formatCurrency(grand)}\n\nTo pay via M-Pesa:\n1. Lipa Na M-Pesa > Paybill/Till\n2. Account: ${invoiceData.invoice_number}\n3. Amount: ${grand}\n\nReceipt sent automatically after payment. Reply HELP for assistance.`;
      }
      return `Hi ${name}, your monthly rent of ${formatCurrency(tenant.monthly_rent)} for ${propertyName} Unit ${unit} is due soon.${util.line}\n\nGrand Total Due: ${formatCurrency(Number(tenant.monthly_rent) + util.total)}\n\nPay via M-Pesa to avoid late fees. Reply HELP for assistance.`;

    case "receipt_request":
      if (receiptData) {
        return `Hi ${name}, here is your payment receipt:\n\nReceipt #: ${receiptData.receipt_number}\nAmount: ${formatCurrency(receiptData.amount)}\nDate: ${new Date(receiptData.payment_date).toLocaleDateString("en-KE", { dateStyle: "medium" })}\nMethod: ${receiptData.payment_method}\nProperty: ${propertyName} Unit ${unit}\n\nThank you for your payment!`;
      }
      return `Hi ${name}, your latest receipt for ${propertyName} Unit ${unit} is being generated. You will receive it shortly.\n\nReply HELP for assistance.`;

    case "balance_inquiry": {
      const rentDue = invoiceData ? Number(invoiceData.amount) : 0;
      const grand = rentDue + util.total;
      if (rentDue === 0 && util.total === 0) {
        return `Hi ${name}, you have no outstanding balance for ${propertyName} Unit ${unit}. You're all caught up!\n\nReply HELP for assistance.`;
      }
      const rentLine = invoiceData
        ? `Rent: ${formatCurrency(rentDue)} (Invoice ${invoiceData.invoice_number}, due ${new Date(invoiceData.due_date).toLocaleDateString("en-KE", { dateStyle: "medium" })})`
        : `Rent: ${formatCurrency(0)}`;
      return `Hi ${name}, balance summary for ${propertyName} Unit ${unit}:\n\n${rentLine}${util.line}\n\nGrand Total: ${formatCurrency(grand)}\n\nReply PAY or use M-Pesa. Reply HELP for assistance.`;
    }

    case "lease_reminder":
      return `Hi ${name}, your lease for ${propertyName} Unit ${unit} expires on ${new Date(tenant.lease_end).toLocaleDateString("en-KE", { dateStyle: "medium" })}.\n\nPlease contact your landlord to discuss renewal options.\n\nReply HELP for assistance.`;

    case "help":
      return `Hi ${name}, services available:\n\nPAYMENT - Pay rent via M-Pesa\nRECEIPT - Get your latest receipt\nBALANCE - Check outstanding balance (rent + utilities)\nLEASE - View lease information\nMAINTENANCE - Report an issue\nHELP - Show this menu\n\nFor further assistance, contact your landlord.`;

    default:
      return "";
  }
};

const sendSMS = async (
  phoneNumber: string,
  message: string,
  apiKey: string,
  username: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    let formattedPhone = phoneNumber.replace(/\s+/g, "").replace(/-/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+254" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+254" + formattedPhone;
    }

    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey: apiKey,
      },
      body: new URLSearchParams({
        username: username,
        to: formattedPhone,
        message: message,
      }),
    });

    const data = await response.json();
    if (data.SMSMessageData?.Recipients?.[0]?.statusCode === 101) {
      return { success: true };
    }
    return {
      success: false,
      error: data.SMSMessageData?.Recipients?.[0]?.status || "Unknown error",
    };
  } catch (error) {
    console.error("SMS send error:", error);
    return { success: false, error: String(error) };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const africasTalkingApiKey = Deno.env.get("AFRICASTALKING_API_KEY");
    const africasTalkingUsername = Deno.env.get("AFRICASTALKING_USERNAME");

    if (!africasTalkingApiKey || !africasTalkingUsername) {
      return new Response(
        JSON.stringify({ success: false, error: "SMS service not configured. Please add Africa's Talking credentials." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Require JWT
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const userId = user.id;

    const { tenantId, messageType, customMessage }: SMSRequest = await req.json();

    if (!tenantId || !messageType) {
      return new Response(
        JSON.stringify({ success: false, error: "tenantId and messageType are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch tenant info — enforce ownership
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("*, property:properties(name)")
      .eq("id", tenantId)
      .eq("user_id", userId)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ success: false, error: "Tenant not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!tenant.phone) {
      return new Response(
        JSON.stringify({ success: false, error: "Tenant has no phone number" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch latest pending invoice for payment/balance prompts
    let invoiceData = null;
    if (["payment_prompt", "balance_inquiry"].includes(messageType)) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "overdue"])
        .order("due_date", { ascending: true })
        .limit(1)
        .single();
      invoiceData = invoice;
    }

    // Fetch latest receipt for receipt prompts
    let receiptData = null;
    if (messageType === "receipt_request") {
      const { data: receipt } = await supabase
        .from("receipts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      receiptData = receipt;
    }

    // Fetch unpaid utility bills for prompts that show what tenant owes
    let utilities: any[] = [];
    if (["payment_prompt", "balance_inquiry"].includes(messageType)) {
      const { data: utils } = await supabase
        .from("utility_bills")
        .select("utility_type, total_amount, billing_period")
        .eq("tenant_id", tenantId)
        .neq("status", "paid")
        .order("billing_period", { ascending: false })
        .limit(6);
      utilities = utils || [];
    }

    // Generate message
    const message = messageType === "custom" && customMessage
      ? customMessage
      : generateMessage(messageType, tenant, invoiceData, receiptData, utilities);

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not generate message" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send SMS
    const smsResult = await sendSMS(tenant.phone, message, africasTalkingApiKey, africasTalkingUsername);

    // Log SMS
    if (userId) {
      await supabase.from("sms_logs").insert({
        user_id: userId,
        tenant_id: tenantId,
        message_type: messageType,
        message_content: message,
        phone_number: tenant.phone,
        status: smsResult.success ? "sent" : "failed",
        error_message: smsResult.error || null,
      });
    }

    return new Response(
      JSON.stringify({
        success: smsResult.success,
        message: smsResult.success
          ? `SMS sent to ${tenant.first_name} ${tenant.last_name}`
          : `Failed to send SMS: ${smsResult.error}`,
        preview: message,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in tenant-sms-prompts:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
