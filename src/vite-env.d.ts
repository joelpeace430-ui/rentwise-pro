/// <reference types="vite/client" />

// MCP tool files run in the Supabase Edge Function (Deno) runtime at request time,
// but are type-checked as part of the Vite project. Declare the `process.env`
// shape used by tools so the shared tsconfig doesn't need @types/node.
declare const process: {
  env: Record<string, string | undefined>;
};
