import { createFileRoute } from "@tanstack/react-router";
import { ConversationList } from "@/kalzo/extras/conversations/Conversations";
import { kalzoHead } from "@/lib/routeHead";
export const Route = createFileRoute("/artist/chats")({
  staticData: { sitemap: false },
  head: () =>
    kalzoHead(
      "Artist chats and calls",
      "Your private Kalzo conversations and meeting invitations.",
      true,
    ),
  component: ConversationList,
});
