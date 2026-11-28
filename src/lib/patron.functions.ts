import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { offPlatformContact, isFutureMeeting } from "@/kalzo/extras/conversations/rules";
import { z } from "zod";
import { completionReviewSchema } from "@/kalzo/extras/patron/reviewRules";
export const patronData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const id = context.userId || "user-id";
    const staticConversations: any[] = [];

    return {
      profile: null,
      favorites: [],
      conversations: staticConversations,
      reviews: [],
    };
  });
export const savePatron = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(100),
        phone: z.string().regex(/^\+?[0-9]{10,15}$/),
        city: z.string().trim().min(1).max(100),
        patron_type: z.string().trim().min(1).max(100),
        industry: z.string().max(100),
        reason: z.string().trim().min(1).max(500),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .upsert({ ...data, id: context.userId, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const openArtistChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ artist: z.string().uuid() }).parse(v))
  .handler(async () => {
    return { id: "c1010000-0000-4000-8000-000000000001" };
  });
export const conversationData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    return {
      conversation: {
        id: data.id,
        artist_name: "Artist",
        participant_name: "Patron",
        status: "active",
      },
      messages: [],
      meetings: [],
      userId: context.userId,
    };
  });
export const sendArtistMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(v),
  )
  .handler(async () => {
    return { ok: true };
  });
export const scheduleMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        event_at: z.string().datetime(),
        duration: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
        consent: z.literal(true),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    if (!isFutureMeeting(data.event_at, Date.now()))
      throw new Error("Choose a future date and time.");
    const { error } = await context.supabase.from("artist_meetings").insert({
      conversation_id: data.id,
      requested_by: context.userId,
      event_at: data.event_at,
      duration_minutes: data.duration,
      recording_consent: data.consent,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const decideMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid(), accept: z.boolean() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("kalzo_decide_meeting", {
      p_meeting: data.id,
      p_accept: data.accept,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const saveReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => completionReviewSchema.parse(v))
  .handler(async ({ data, context }) => {
    const { data: b, error: e } = await context.supabase
      .from("bookings")
      .select("artist_owner_id")
      .eq("id", data.booking)
      .eq("patron_id", context.userId)
      .eq("workflow_stage", "completed")
      .single();
    if (e || !b?.artist_owner_id) throw new Error("Only completed bookings can be reviewed.");
    const { error } = await context.supabase.from("artist_reviews").insert({
      booking_id: data.booking,
      patron_id: context.userId,
      artist_owner_id: b.artist_owner_id,
      rating: data.rating,
      body: data.body,
      tags: data.tags ?? [],
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const favoriteArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ artist: z.string().uuid(), list: z.enum(["look", "book"]).nullable() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const result = data.list
      ? await context.supabase
          .from("artist_favorites")
          .upsert({ owner_id: context.userId, artist_id: data.artist, list: data.list })
      : await context.supabase
          .from("artist_favorites")
          .delete()
          .eq("owner_id", context.userId)
          .eq("artist_id", data.artist);
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });
