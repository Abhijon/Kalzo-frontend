import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { offPlatformContact, isFutureMeeting } from "@/kalzo/extras/conversations/rules";
import { z } from "zod";
import { completionReviewSchema } from "@/kalzo/extras/patron/reviewRules";
export const patronData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase,
      id = context.userId;
    const [p, f, c, r] = await Promise.all([
      db.from("profiles").select("*").eq("id", id).maybeSingle(),
      db.from("artist_favorites").select("*").eq("owner_id", id),
      db.from("artist_conversations").select("*").order("created_at", { ascending: false }),
      db.from("artist_reviews").select("*").eq("patron_id", id),
    ]);
    for (const x of [p, f, c, r]) if (x.error) throw new Error(x.error.message);
    const conversations = await Promise.all((c.data ?? []).map(async (conversation) => {
      const otherId = conversation.artist_owner_id === id ? conversation.patron_id : conversation.artist_owner_id;
      const [person, latest, meeting] = await Promise.all([
        db.from("profiles").select("full_name").eq("id", otherId).maybeSingle(),
        db.from("artist_chat_messages").select("body").eq("conversation_id", conversation.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        db.from("artist_meetings").select("event_at").eq("conversation_id", conversation.id).in("status", ["pending", "accepted_setup_required", "accepted"]).gte("event_at", new Date().toISOString()).order("event_at").limit(1).maybeSingle(),
      ]);
      return { ...conversation, participant_name: person.data?.full_name || (conversation.artist_owner_id === id ? "Patron" : conversation.artist_name), latest_message: latest.data?.body ?? "", next_meeting: meeting.data?.event_at ?? null };
    }));
    const publicArtists = (f.data ?? []).length ? (await db.rpc("kalzo_public_artists")).data ?? [] : [];
    const favorites = (f.data ?? []).map((x) => {
      const a = publicArtists.find((y) => y.id === x.artist_id);
      return { ...x, stage_name: a?.stage_name ?? null, discipline: a?.discipline ?? "Other", base_city: a?.base_city ?? null, rate_inr: a?.rate_inr ?? null };
    });
    return {
      profile: p.data,
      favorites,
      conversations,
      reviews: r.data ?? [],
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
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("kalzo_open_artist_chat", {
      p_artist: data.artist,
    });
    if (error) throw new Error(error.message);
    return { id };
  });
export const conversationData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const [c, m, t] = await Promise.all([
      db.from("artist_conversations").select("*").eq("id", data.id).single(),
      db
        .from("artist_chat_messages")
        .select("*")
        .eq("conversation_id", data.id)
        .order("created_at"),
      db.from("artist_meetings").select("*").eq("conversation_id", data.id).order("event_at"),
    ]);
    for (const x of [c, m, t]) if (x.error) throw new Error(x.error.message);
    return {
      conversation: c.data,
      messages: m.data ?? [],
      meetings: t.data ?? [],
      userId: context.userId,
    };
  });
export const sendArtistMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(v),
  )
  .handler(async ({ data, context }) => {
    if (offPlatformContact(data.body))
      throw new Error(
        "Keep contact and payment arrangements on Kalzo. Do not share phone numbers or off-platform payment details.",
      );
    const { error } = await context.supabase
      .from("artist_chat_messages")
      .insert({ conversation_id: data.id, sender_id: context.userId, body: data.body });
    if (error) throw new Error(error.message);
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
