 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
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
 
 interface AfricasTalkingResponse {
   SMSMessageData?: {
     Recipients: Array<{
       statusCode: number;
       number: string;
       status: string;
       cost: string;
       messageId: string;
     }>;
   };
 }
 
 const sendSMS = async (
   phoneNumber: string,
   message: string,
   apiKey: string,
   username: string
 ): Promise<{ success: boolean; error?: string }> => {
   try {
     // Format phone number for Kenya (add +254 if not present)
     let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
     if (formattedPhone.startsWith('0')) {
       formattedPhone = '+254' + formattedPhone.substring(1);
     } else if (!formattedPhone.startsWith('+')) {
       formattedPhone = '+254' + formattedPhone;
     }
 
     const response = await fetch('https://api.africastalking.com/version1/messaging', {
       method: 'POST',
       headers: {
         'Accept': 'application/json',
         'Content-Type': 'application/x-www-form-urlencoded',
         'apiKey': apiKey,
       },
       body: new URLSearchParams({
         username: username,
         to: formattedPhone,
         message: message,
       }),
     });
 
     const data: AfricasTalkingResponse = await response.json();
     
     if (data.SMSMessageData?.Recipients?.[0]?.statusCode === 101) {
       return { success: true };
     }
     
     return { 
       success: false, 
       error: data.SMSMessageData?.Recipients?.[0]?.status || 'Unknown error' 
     };
   } catch (error) {
     console.error('SMS send error:', error);
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
       console.log("Africa's Talking credentials not configured");
       return new Response(
         JSON.stringify({ 
           message: "SMS reminders not configured. Please add Africa's Talking API credentials." 
         }),
         { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     // Calculate the date 2 days from now
     const today = new Date();
     const twoDaysFromNow = new Date(today);
     twoDaysFromNow.setDate(today.getDate() + 2);
     const targetDate = twoDaysFromNow.toISOString().split('T')[0];
 
     // Get all tenants with invoices due in 2 days
     const { data: invoices, error: invoicesError } = await supabase
       .from("invoices")
       .select(`
         id,
         invoice_number,
         amount,
         due_date,
         tenant:tenants(
           id,
           first_name,
           last_name,
           phone,
           monthly_rent,
           unit_number,
           property:properties(name)
         )
       `)
       .eq("status", "pending")
       .eq("due_date", targetDate);
 
     if (invoicesError) {
       console.error("Error fetching invoices:", invoicesError);
       throw invoicesError;
     }
 
     if (!invoices || invoices.length === 0) {
       console.log("No invoices due in 2 days");
       return new Response(
         JSON.stringify({ message: "No invoices due in 2 days" }),
         { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
     const results: Array<{ phone: string; status: string; tenant: string }> = [];
 
     for (const invoice of invoices) {
       const tenant = invoice.tenant as any;
       if (!tenant?.phone) {
         console.log(`No phone number for tenant ${tenant?.first_name} ${tenant?.last_name}`);
         continue;
       }
 
       const propertyName = Array.isArray(tenant.property) 
         ? tenant.property[0]?.name 
         : tenant.property?.name;
 
       const message = `Hi ${tenant.first_name}, your rent of ${formatCurrency(invoice.amount)} for ${propertyName || 'your property'} Unit ${tenant.unit_number} is due on ${new Date(invoice.due_date).toLocaleDateString('en-KE', { dateStyle: 'medium' })}. Pay via M-Pesa to avoid late fees. Invoice: ${invoice.invoice_number}`;
 
       const smsResult = await sendSMS(
         tenant.phone,
         message,
         africasTalkingApiKey,
         africasTalkingUsername
       );
 
       results.push({
         phone: tenant.phone,
         status: smsResult.success ? 'sent' : `failed: ${smsResult.error}`,
         tenant: `${tenant.first_name} ${tenant.last_name}`,
       });
 
       console.log(`SMS to ${tenant.phone}: ${smsResult.success ? 'sent' : 'failed'}`);
     }
 
     const sentCount = results.filter(r => r.status === 'sent').length;
 
     return new Response(
       JSON.stringify({
         message: `Sent ${sentCount} SMS reminders`,
         results,
       }),
       {
         status: 200,
         headers: { "Content-Type": "application/json", ...corsHeaders },
       }
     );
   } catch (error: any) {
     console.error("Error in send-sms-reminder function:", error);
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