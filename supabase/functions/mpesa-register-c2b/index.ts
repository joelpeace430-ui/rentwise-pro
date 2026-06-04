// Registers the C2B Validation/Confirmation URLs with Safaricom for the
// logged-in user's stored M-Pesa settings.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: settings } = await admin
      .from("mpesa_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!settings) {
      return new Response(JSON.stringify({ error: "No M-Pesa settings found. Save your Paybill/Till first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = settings.environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

    // 1. Get OAuth token
    const creds = btoa(`${settings.consumer_key}:${settings.consumer_secret}`);
    const authRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${creds}` },
    });
    const authJson = await authRes.json();
    if (!authRes.ok || !authJson.access_token) {
      console.error("OAuth failed:", authJson);
      return new Response(JSON.stringify({ error: "M-Pesa auth failed. Check Consumer Key/Secret.", details: authJson }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callbackBase = `${supabaseUrl}/functions/v1/mpesa-c2b-callback`;
    const qs = `?shortcode=${settings.shortcode}&secret=${settings.callback_secret}`;

    // 2. Register URLs
    const regRes = await fetch(`${baseUrl}/mpesa/c2b/v1/registerurl`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authJson.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ShortCode: settings.shortcode,
        ResponseType: "Completed",
        ConfirmationURL: `${callbackBase}${qs}`,
        ValidationURL: `${callbackBase}${qs}`,
      }),
    });
    const regJson = await regRes.json();
    console.log("RegisterURL response:", regJson);

    if (!regRes.ok || regJson.ResponseCode !== "0") {
      return new Response(JSON.stringify({ error: "Failed to register URLs", details: regJson }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("mpesa_settings")
      .update({ last_registered_at: new Date().toISOString() })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({ success: true, message: "Callback URLs registered with Safaricom", details: regJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
