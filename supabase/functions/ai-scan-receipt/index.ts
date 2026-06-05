import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EXPENSE_CATEGORIES = [
  "Property Maintenance",
  "Repairs",
  "Insurance",
  "Property Taxes",
  "Utilities",
  "Management Fees",
  "Legal & Professional",
  "Advertising",
  "Cleaning",
  "Landscaping",
  "Supplies",
  "Travel",
  "Other",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseSrv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const authClient = createClient(supabaseUrl, supabaseAnon);
    const { data: { user }, error: authErr } = await authClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { receiptPath } = await req.json();
    if (!receiptPath || typeof receiptPath !== "string") {
      return new Response(JSON.stringify({ error: "receiptPath required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ownership check: path must start with user's id
    if (!receiptPath.startsWith(`${user.id}/`)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const svc = createClient(supabaseUrl, supabaseSrv);
    const { data: signed, error: signErr } = await svc.storage
      .from("expense-receipts")
      .createSignedUrl(receiptPath, 300);
    if (signErr || !signed) throw new Error("Could not access receipt");

    // Fetch the file and convert to base64 data URL
    const fileResp = await fetch(signed.signedUrl);
    if (!fileResp.ok) throw new Error("Failed to download receipt");
    const contentType = fileResp.headers.get("content-type") || "image/jpeg";
    const buf = new Uint8Array(await fileResp.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    const b64 = btoa(binary);
    const dataUrl = `data:${contentType};base64,${b64}`;

    const systemPrompt = `You are a receipt scanner for a Kenyan property management app. Extract structured data from the receipt image. Amounts are in Kenyan Shillings (KES). Pick the best matching category from this exact list: ${EXPENSE_CATEGORIES.join(", ")}. Always respond with ONLY a valid JSON object, no markdown, matching this schema: {"vendor": string, "amount": number, "expense_date": "YYYY-MM-DD", "description": string, "category": string}. If a field is unreadable use null (except amount which should be 0). expense_date must be ISO format.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the receipt details as JSON." },
              { type: "image_url", image_url: { url: dataUrl } },
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

    // Normalize
    const out = {
      vendor: typeof parsed.vendor === "string" ? parsed.vendor : "",
      amount: Number(parsed.amount) || 0,
      expense_date: typeof parsed.expense_date === "string" ? parsed.expense_date : "",
      description: typeof parsed.description === "string" ? parsed.description : "",
      category: EXPENSE_CATEGORIES.includes(parsed.category) ? parsed.category : "",
    };

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-scan-receipt error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
