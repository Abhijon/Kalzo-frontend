import { z } from "zod";
import { KALZO_CONTACT } from "./contacts";
import { convertToModelMessages, type UIMessage } from "ai";
import { callerId } from "./razorpay-server";
import { createResponsesCall } from "./ai/responses.server.ts";
import { withLovableAiGatewayRunIdHeader } from "./ai/run-id.server.ts";
const bodySchema = z.object({
  threadId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        role: z.enum(["user", "assistant"]),
        parts: z
          .array(
            z.object({ type: z.string(), text: z.string().max(2000).optional() }).passthrough(),
          )
          .max(100),
      }),
    )
    .min(1)
    .max(300),
});
export async function handleSupport(request: Request) {
  const user = await callerId(request);
  if (!user) return new Response("Please sign in for account support.", { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid support request.", { status: 400 });
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: thread, error } = await db
    .from("support_threads")
    .select("*")
    .eq("id", parsed.data.threadId)
    .eq("owner_id", user)
    .single();
  if (error || !thread) return new Response("Conversation not found.", { status: 404 });
  const { data: stored, error: loadErr } = await db
    .from("support_messages")
    .select("message")
    .eq("thread_id", thread.id)
    .order("created_at");
  if (loadErr) return new Response("Could not load support history.", { status: 500 });
  const last = parsed.data.messages.at(-1);
  if (!last || last.role !== "user")
    return new Response("A user message is required.", { status: 400 });
  const history = [
    ...(stored ?? []).map((m) => m.message as unknown as UIMessage),
    last as UIMessage,
  ];
  const { error: saveErr } = await db
    .from("support_messages")
    .upsert(
      { thread_id: thread.id, sdk_id: last.id, message: JSON.parse(JSON.stringify(last)) },
      { onConflict: "thread_id,sdk_id" },
    );
  if (saveErr) return new Response("Could not save your message.", { status: 500 });
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return new Response("Support AI is not configured.", { status: 503 });
  const prompt = `You are Kalzo Support. This issue category is ${thread.category}. Be warm, concise and factual. Kalzo is preparing for launch: there is one non-payable sample profile; public payments are paused. Real artist drafts save photos, Instagram and 2 required/2 optional reels. Artists are verified by recording a live face video in their profile, which the Kalzo team manually compares with their profile photo and Instagram; only the team can mark an artist verified. Arrival and closing codes will be generated per verified paid booking, not on signup; the generation hook is not yet enabled because payments are paused. Venue proof is required before performance. Payout/refund automation is not connected. Login and signup use a 6-digit code emailed to the user, or Google; there are no passwords and Kalzo sends no SMS. The patron sees each booking code inside their Kalzo booking page and tells it to the artist in person. Never claim a refund, SMS, identity approval, payment capture or bank payout happened. Never request Aadhaar numbers or secret codes. You have no authority to change a booking. Ask the user to open My bookings for status. Official WhatsApp and contact number: ${KALZO_CONTACT.phone}; email: ${KALZO_CONTACT.email}. WhatsApp is a direct contact link, not an automated assistant. Do not invent cancellation fees or response times.`;
  try {
    const { result, gateway } = createResponsesCall(
      request,
      { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key, model: "openai/gpt-6-astra" },
      await convertToModelMessages(history),
      prompt,
    );
    return withLovableAiGatewayRunIdHeader(
      result.toUIMessageStreamResponse({
        originalMessages: history,
        sendReasoning: true,
        onError: (e) => (e instanceof Error ? e.message : "Support request failed."),
        onFinish: async ({ messages }) => {
          for (const m of messages) {
            if (m.role !== "assistant") continue;
            const { error } = await db
              .from("support_messages")
              .upsert(
                { thread_id: thread.id, sdk_id: m.id, message: JSON.parse(JSON.stringify(m)) },
                { onConflict: "thread_id,sdk_id" },
              );
            if (error) throw new Error("Could not save support reply: " + error.message);
          }
        },
      }),
      gateway,
    );
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Support unavailable.", {
      status: request.signal.aborted ? 499 : 500,
    });
  }
}
