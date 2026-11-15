/**
 * Supabase Compatibility Layer
 * Redirects all legacy Supabase queries and auth calls to the centralized API client (`src/lib/api.ts`).
 * This removes all hard dependencies on Supabase cloud.
 */
import { api } from "@/lib/api";

export const supabase: any = {
  auth: api.auth,
  storage: api.storage,
  from: (table: string) => api.from(table),
  rpc: (fn: string, args?: any) => api.rpc(fn, args),
};

export default supabase;
