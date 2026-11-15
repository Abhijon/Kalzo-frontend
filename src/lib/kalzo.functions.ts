import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { artistDraftSchema, SUPPORT_CATEGORIES } from "@/kalzo/extras/launchRules";
import { ownsArtistMedia } from "./artistMedia";
export const accountData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [a, b, t, r] = await Promise.all([
      supabase.from("artist_profiles").select("*").eq("owner_id", userId).maybeSingle(),
      supabase
        .from("bookings")
        .select("*")
        .or(`patron_id.eq.${userId},artist_owner_id.eq.${userId}`)
        .order("created_at", { ascending: false }),
      supabase
        .from("support_threads")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false }),
      supabase.rpc("kalzo_is_admin"),
    ]);
    for (const result of [a, b, t, r]) if (result.error) throw new Error(result.error.message);
    return { artist: a.data, bookings: b.data ?? [], threads: t.data ?? [], isAdmin: !!r.data };
  });
export const saveArtistDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => artistDraftSchema.parse(v))
  .handler(async ({ data, context }) => {
    const { data: payout, error: payoutError } = await context.supabase
      .from("artist_payout_accounts")
      .select("account_last4")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (payoutError) throw new Error(payoutError.message);
    if (!payout) throw new Error("Save your bank details before submitting your profile.");
    const paths = [
      data.photo_path,
      data.art_photo_path,
      ...data.reels,
      data.face_video_path,
    ].filter(Boolean);
    if (paths.some((p) => !ownsArtistMedia(context.userId, p)))
      throw new Error("Media must belong to your account.");
    const { data: row, error } = await context.supabase
      .from("artist_profiles")
      .upsert(
        {
          ...data,
          owner_id: context.userId,
          status: "pending_review",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id" },
      )
      .select("id,status,verification_status")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
export const newSupportThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ category: z.enum(SUPPORT_CATEGORIES) }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("support_threads")
      .insert({ owner_id: context.userId, category: data.category, title: data.category })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
export const supportHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: thread, error } = await context.supabase
      .from("support_threads")
      .select("*")
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .single();
    if (error || !thread) throw new Error("Conversation not found.");
    const { data: messages, error: err } = await context.supabase
      .from("support_messages")
      .select("message")
      .eq("thread_id", data.id)
      .order("created_at");
    if (err) throw new Error(err.message);
    return { thread, messages: (messages ?? []).map((m) => m.message) };
  });
export const adminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("kalzo_is_admin");
    if (error || !isAdmin) throw new Error("This page is only for the Kalzo administrator.");
    const [a, p, b, t] = await Promise.all([
      context.supabase
        .from("artist_profiles")
        .select("*")
        .order("created_at", { ascending: false }),
      context.supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      context.supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      context.supabase
        .from("support_threads")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    for (const x of [a, p, b, t]) if (x.error) throw new Error(x.error.message);
    return {
      artists: a.data ?? [],
      patrons: p.data ?? [],
      bookings: b.data ?? [],
      threads: t.data ?? [],
    };
  });
export const adminSupportHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: ok, error: roleError } = await context.supabase.rpc("kalzo_is_admin");
    if (roleError || !ok) throw new Error("Administrator access required.");
    const { data: messages, error } = await context.supabase
      .from("support_messages")
      .select("message,created_at")
      .eq("thread_id", data.id)
      .order("created_at");
    if (error) throw new Error(error.message);
    return messages ?? [];
  });
export const verifyArtistFace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ id: z.string().uuid(), result: z.enum(["verified", "failed"]) }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("kalzo_is_admin");
    if (!ok) throw new Error("Administrator access required.");
    const { error } = await context.supabase
      .from("artist_profiles")
      .update({
        verification_status: data.result,
        ...(data.result === "failed" ? { status: "pending_review" } : {}),
      })
      .eq("id", data.id)
      .neq("face_video_path", "");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const reviewArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["approved", "pending_review", "rejected"]) })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("kalzo_is_admin");
    if (!ok) throw new Error("Administrator access required.");
    const { error } = await context.supabase
      .from("artist_profiles")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const approveBookingCancellation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("kalzo_admin_cancel_review", { p_booking: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
