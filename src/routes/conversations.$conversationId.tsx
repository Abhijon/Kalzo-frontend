import { createFileRoute } from "@tanstack/react-router";
import { AccountShell } from "@/kalzo/extras/AccountShell";
import { ConversationRoom } from "@/kalzo/extras/conversations/Conversations";
import { kalzoHead } from "@/lib/routeHead";
export const Route = createFileRoute("/conversations/$conversationId")({
  staticData: { sitemap: false },
  head: () =>
    kalzoHead(
      "Private artist conversation",
      "Your Kalzo artist messages and scheduled call invitations.",
      true,
    ),
  component: Room,
});
function Room() {
  const { conversationId } = Route.useParams();
  return (
    <AccountShell title="Chats & calls">
      <ConversationRoom id={conversationId} />
    </AccountShell>
  );
}
