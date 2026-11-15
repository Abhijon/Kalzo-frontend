import { createMiddleware } from "@tanstack/react-start";
import { api } from "@/lib/api";

export const attachAuthToken = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await api.auth.getSession();
    const token = data?.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
);

export const attachSupabaseAuth = attachAuthToken;
