import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AccountShell } from "@/kalzo/extras/AccountShell";
import { ConversationRoom } from "@/kalzo/extras/conversations/Conversations";
import { kalzoHead } from "@/lib/routeHead";

export const Route = createFileRoute("/conversations/$conversationId")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>): { from?: string; artist?: string } => ({
    from: typeof s["from"] === "string" ? s["from"] : undefined,
    artist: typeof s["artist"] === "string" ? s["artist"] : undefined,
  }),
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
  const search = Route.useSearch();
  const nav = useNavigate();

  const handleBack = () => {
    if (search.from === "profile" && search.artist) {
      void nav({ to: "/", search: { artist: search.artist } });
      return;
    }
    if (search.from === "profile") {
      void nav({ to: "/" });
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    void nav({ to: "/artist/chats" });
  };

  const backLabel =
    search.from === "profile" ? "← Back to artist profile" : "← Back to chats";

  return (
    <AccountShell
      title="Chats & calls"
      lead={
        <button
          type="button"
          onClick={handleBack}
          className="kb-detail-link kb-detail-back"
          style={{
            background: "none",
            border: "none",
            padding: "0 0 12px 0",
            cursor: "pointer",
            fontFamily: "'DM Mono', monospace",
            fontSize: "12px",
            letterSpacing: "0.14em",
            color: "#2A1D18",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {backLabel}
        </button>
      }
    >
      <ConversationRoom id={conversationId} onBack={handleBack} />
    </AccountShell>
  );
}
