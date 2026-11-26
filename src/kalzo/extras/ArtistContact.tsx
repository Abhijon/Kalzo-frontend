import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { MessageSquare, Video, Heart, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openArtistChat, favoriteArtist } from "@/lib/patron.functions";
import { api } from "@/lib/api";
import { PatronGate } from "./PatronGate";

export function ArtistContact({
  artist,
  signed: propSigned,
}: {
  artist: string;
  signed?: boolean;
}) {
  const open = useServerFn(openArtistChat),
    favorite = useServerFn(favoriteArtist),
    nav = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [askAuth, setAskAuth] = useState(false);
  const [pendingAction, setPendingAction] = useState<"chat" | "call" | "look" | "book" | null>(null);

  useEffect(() => {
    let sub: { unsubscribe: () => void } | null = null;
    api.auth.getUser().then(({ data }) => setAuthed(!!data?.user));
    const subRes = api.auth.onAuthStateChange((_e, s) => {
      const isUser = !!s?.user;
      setAuthed(isUser);
      if (isUser) {
        setAskAuth(false);
      }
    });
    sub = subRes.data?.subscription ?? null;
    return () => sub?.unsubscribe();
  }, []);

  const isUserAuthed = typeof propSigned === "boolean" ? propSigned : (authed ?? false);

  const chat = async () => {
    setBusy(true);
    try {
      const c = await open({ data: { artist } });
      await nav({
        to: "/conversations/$conversationId",
        params: { conversationId: c.id },
        search: { from: "profile", artist },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open chat.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!isUserAuthed || !pendingAction) return;
    const act = pendingAction;
    setPendingAction(null);
    if (act === "chat" || act === "call") {
      void chat();
    } else if (act === "look") {
      void favorite({ data: { artist, list: "look" } })
        .then(() => setError("Saved to look later."))
        .catch((e) => setError(e.message));
    } else if (act === "book") {
      void favorite({ data: { artist, list: "book" } })
        .then(() => setError("Saved to book later."))
        .catch((e) => setError(e.message));
    }
  }, [isUserAuthed, pendingAction]);

  const handleChat = (kind: "chat" | "call") => {
    if (!isUserAuthed) {
      setPendingAction(kind);
      setAskAuth(true);
      return;
    }
    void chat();
  };

  const handleLook = () => {
    if (!isUserAuthed) {
      setPendingAction("look");
      setAskAuth(true);
      return;
    }
    void favorite({ data: { artist, list: "look" } })
      .then(() => setError("Saved to look later."))
      .catch((e) => setError(e.message));
  };

  const handleBook = () => {
    if (!isUserAuthed) {
      setPendingAction("book");
      setAskAuth(true);
      return;
    }
    void favorite({ data: { artist, list: "book" } })
      .then(() => setError("Saved to book later."))
      .catch((e) => setError(e.message));
  };

  return (
    <div className="kl-account !min-h-0 !p-4">
      {askAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-[640px] overflow-y-auto">
            <PatronGate
              onBack={() => {
                setAskAuth(false);
                setPendingAction(null);
              }}
            />
          </div>
        </div>
      )}
      <div className="kl-actions">
        <Button disabled={busy} onClick={() => handleChat("chat")}>
          <MessageSquare size={16} />
          Chat with artist
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => handleChat("call")}>
          <Video size={16} />
          Virtual call · Zoom
        </Button>
        <Button variant="outline" onClick={handleLook}>
          <Heart size={16} />
          To look later
        </Button>
        <Button variant="outline" onClick={handleBook}>
          To book
        </Button>
      </div>
      {error && <p role="status">{error}</p>}
    </div>
  );
}
