import "https://deno.land/std@0.224.0/dotenv/load.ts";
Deno.test("probe env", () => {
  const keys = ["SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","VITE_SUPABASE_URL","VITE_SUPABASE_PUBLISHABLE_KEY"];
  for (const k of keys) console.log(k, Deno.env.get(k) ? "SET" : "MISSING");
});
