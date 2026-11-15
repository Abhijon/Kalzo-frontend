import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { MessageSquare, Video, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openArtistChat, favoriteArtist } from "@/lib/patron.functions";
export function ArtistContact({ artist }: { artist: string }) {
  const open = useServerFn(openArtistChat),
    favorite = useServerFn(favoriteArtist),
    nav = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const chat = async () => {
    setBusy(true);
    try {
      const c = await open({ data: { artist } });
      await nav({ to: "/conversations/$conversationId", params: { conversationId: c.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open chat.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="kl-account !min-h-0 !p-4">
      <div className="kl-actions">
        <Button disabled={busy} onClick={() => void chat()}>
          <MessageSquare size={16} />
          Chat with artist
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => void chat()}>
          <Video size={16} />
          Virtual call · Zoom
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            void favorite({ data: { artist, list: "look" } })
              .then(() => setError("Saved to look later."))
              .catch((e) => setError(e.message))
          }
        >
          <Heart size={16} />
          To look later
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            void favorite({ data: { artist, list: "book" } })
              .then(() => setError("Saved to book later."))
              .catch((e) => setError(e.message))
          }
        >
          To book
        </Button>
      </div>
      {error && <p role="status">{error}</p>}
    </div>
  );
}
