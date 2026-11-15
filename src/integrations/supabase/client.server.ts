/**
 * Server-side compatibility client
 * Redirects server-side queries to the single base URL backend (`src/lib/api.ts`).
 */
import { api } from "@/lib/api";

export const supabaseAdmin: any = {
  auth: api.auth,
  storage: api.storage,
  from: (table: string) => api.from(table),
  rpc: (fn: string, args?: any) => api.rpc(fn, args),
};

export default supabaseAdmin;
