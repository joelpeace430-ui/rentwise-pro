import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QuarterInfo {
  quarter: string;
  dueDate: string;
  reminderMonth: number;
  reminderDay: number;
}

const quarters: QuarterInfo[] = [
  { quarter: "Q1", dueDate: "April 15", reminderMonth: 3, reminderDay: 1 }, // Remind April 1
  { quarter: "Q2", dueDate: "June 15", reminderMonth: 5, reminderDay: 1 }, // Remind June 1
  { quarter: "Q3", dueDate: "September 15", reminderMonth: 8, reminderDay: 1 }, // Remind Sept 1
  { quarter: "Q4", dueDate: "January 15", reminderMonth: 0, reminderDay: 1 }, // Remind Jan 1
];

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();

    // Find if we need to send reminders for any quarter
    const quarterToRemind = quarters.find(
      (q) => q.reminderMonth === currentMonth && q.reminderDay === currentDay
    );

    if (!quarterToRemind) {
      console.log("No reminders to send today");
      return new Response(
        JSON.stringify({ message: "No reminders to send today" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all users with profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email, first_name, last_name, business_name");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log("No profiles found");
      return new Response(
        JSON.stringify({ message: "No profiles to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailPromises = profiles.map(async (profile) => {
      if (!profile.email) return null;

      const recipientName = profile.first_name || profile.business_name || "Property Owner";
      const dueYear = quarterToRemind.quarter === "Q4" ? currentYear + 1 : currentYear;

      try {
        const emailResponse = await resend.emails.send({
          from: "Tax Reminders <onboarding@resend.dev>",
          to: [profile.email],
          subject: `${quarterToRemind.quarter} Estimated Tax Payment Due ${quarterToRemind.dueDate}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a1a2e;">Quarterly Tax Payment Reminder</h1>
              <p>Hello ${recipientName},</p>
              <p>This is a friendly reminder that your <strong>${quarterToRemind.quarter} estimated tax payment</strong> is due on <strong>${quarterToRemind.dueDate}, ${dueYear}</strong>.</p>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #16213e;">Important Dates:</h3>
                <ul style="color: #333;">
                  <li><strong>Due Date:</strong> ${quarterToRemind.dueDate}, ${dueYear}</li>
                  <li><strong>Quarter:</strong> ${quarterToRemind.quarter}</li>
                </ul>
              </div>
              <p>To view your estimated tax liability and make your payment, please log in to your account and visit the Tax Center.</p>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                This is an automated reminder. Please do not reply to this email.
              </p>
            </div>
          `,
        });

        console.log(`Email sent to ${profile.email}:`, emailResponse);
        return { email: profile.email, status: "sent" };
      } catch (emailError) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
        return { email: profile.email, status: "failed", error: emailError };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r) => r?.status === "sent").length;

    console.log(`Sent ${successCount} reminder emails for ${quarterToRemind.quarter}`);

    return new Response(
      JSON.stringify({
        message: `Sent ${successCount} reminder emails for ${quarterToRemind.quarter}`,
        results: results.filter(Boolean),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-tax-reminder function:", error);
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
