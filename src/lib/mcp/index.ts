import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProperties from "./tools/list-properties";
import listTenants from "./tools/list-tenants";
import listInvoices from "./tools/list-invoices";
import listPayments from "./tools/list-payments";
import listMaintenance from "./tools/list-maintenance";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "rentflow-mcp",
  title: "RentFlow MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for RentFlow property management. Use these to query properties, tenants, invoices, payments, and maintenance requests for the signed-in user. Results respect the user's role-based access.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProperties, listTenants, listInvoices, listPayments, listMaintenance],
});
