import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const authClient = createClient(supabaseUrl, supabaseAnon);
    const { data: { user }, error: authErr } = await authClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileDataUrl, mimeType } = await req.json();
    if (!fileDataUrl || typeof fileDataUrl !== "string") {
      return new Response(JSON.stringify({ error: "fileDataUrl required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You extract landlord, property, and tenant information from Kenyan rental/lease documents (lease agreements, tenancy schedules, rent rolls, ID scans, handwritten lists, spreadsheets, photos). Currency is Kenyan Shillings (KES). Phone numbers should be normalized to +254 format when possible. Respond with ONLY a valid JSON object, no markdown, matching this schema exactly:
{
  "landlord": { "first_name": string, "last_name": string, "email": string, "phone": string, "business_name": string },
  "property": { "name": string, "address": string, "location": string, "total_units": number, "rent_per_unit": number },
  "tenants": [ { "first_name": string, "last_name": string, "email": string, "phone": string, "unit_number": string, "monthly_rent": number } ]
}
Use empty string "" for unreadable text fields and 0 for unreadable numeric fields. Never invent data. If the document only contains tenants, leave landlord/property fields empty. Extract ALL tenants you can see.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract landlord, property and all tenants from this document as JSON." },
              { type: "image_url", image_url: { url: fileDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI error", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI scan failed");
    }

    const result = await aiResp.json();
    const content = result.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const ll = parsed.landlord || {};
    const pr = parsed.property || {};
    const ts = Array.isArray(parsed.tenants) ? parsed.tenants : [];

    const out = {
      landlord: {
        first_name: String(ll.first_name || ""),
        last_name: String(ll.last_name || ""),
        email: String(ll.email || ""),
        phone: String(ll.phone || ""),
        business_name: String(ll.business_name || ""),
      },
      property: {
        name: String(pr.name || ""),
        address: String(pr.address || ""),
        location: String(pr.location || ""),
        total_units: Number(pr.total_units) || 0,
        rent_per_unit: Number(pr.rent_per_unit) || 0,
      },
      tenants: ts.map((t: any) => ({
        first_name: String(t.first_name || ""),
        last_name: String(t.last_name || ""),
        email: String(t.email || ""),
        phone: String(t.phone || ""),
        unit_number: String(t.unit_number || ""),
        monthly_rent: Number(t.monthly_rent) || 0,
      })),
    };

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-scan-onboarding error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
