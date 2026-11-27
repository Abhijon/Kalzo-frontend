import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { PatronGate } from "./PatronGate";
import { Sparkles, Music, LogOut, ArrowRight, X } from "lucide-react";

export type JoinArtistModalState = "artist" | "customer" | "signup" | null;

export function openJoinArtistModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kalzo:open-join-artist"));
}

export function JoinArtistModal() {
  const navigate = useNavigate();
  const [modalState, setModalState] = useState<JoinArtistModalState>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOpen = async () => {
      try {
        const { data } = await api.auth.getUser();
        const user = data?.user;
        if (!user) {
          setModalState("signup");
        } else {
          const role = (user.role as string | undefined)?.toUpperCase();
          if (role === "ARTIST") {
            setModalState("artist");
          } else {
            setModalState("customer");
          }
        }
      } catch {
        setModalState("signup");
      }
    };

    window.addEventListener("kalzo:open-join-artist", handleOpen);
    return () => window.removeEventListener("kalzo:open-join-artist", handleOpen);
  }, []);

  if (!modalState) return null;

  const handleClose = () => setModalState(null);

  const handleGoToArtistPanel = async () => {
    handleClose();
    await navigate({ to: "/artist/profile" });
  };

  const handleSignOutAndJoin = async () => {
    await api.auth.signOut();
    setModalState("signup");
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-[560px] overflow-y-auto">
        {modalState === "signup" ? (
          <div className="relative">
            <PatronGate
              audience="artist"
              initialMode="create"
              chooseAudience={false}
              onBack={handleClose}
            />
          </div>
        ) : (
          <div className="relative rounded bg-[#F7EFDC] p-8 text-[#2A1D18] shadow-2xl border border-[#B08D57] outline outline-1 outline-[#B08D57] -outline-offset-8">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 p-1.5 text-[#8A6D3B] hover:text-[#2A1D18] transition-colors rounded cursor-pointer"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {modalState === "artist" ? (
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E7A042]/20 border border-[#B08D57] text-[#8A6D3B]">
                  <Music size={26} />
                </div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#8A6D3B] mb-1.5">
                  EST. MMXXVI · HOUSE OF KALZO
                </p>
                <h3 className="font-serif text-2xl md:text-3xl font-medium mb-3 text-[#2A1D18]">
                  You are already a Kalzo Artist
                </h3>
                <p className="font-serif text-base text-[#6B5246] mb-6 leading-relaxed max-w-[420px]">
                  You are currently signed in with an active Artist account. You can manage your performance calendar, incoming booking invitations, and public portfolio directly in your Artist Panel.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => void handleGoToArtistPanel()}
                    className="flex-1 rounded-full bg-[#E7A042] px-6 py-3.5 font-mono text-xs font-semibold tracking-wider text-[#2A1D18] border border-[#B08D57] shadow-sm hover:bg-[#deb332] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    GO TO ARTIST PANEL <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full border border-[#B08D57]/60 px-5 py-3.5 font-mono text-xs tracking-wider text-[#8A6D3B] hover:bg-[#B08D57]/10 transition-colors cursor-pointer"
                  >
                    CLOSE
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#8A6D3B]/20 border border-[#B08D57] text-[#8A6D3B]">
                  <Sparkles size={26} />
                </div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#8A6D3B] mb-1.5">
                  EST. MMXXVI · HOUSE OF KALZO
                </p>
                <h3 className="font-serif text-2xl md:text-3xl font-medium mb-3 text-[#2A1D18]">
                  Signed in as a Patron
                </h3>
                <p className="font-serif text-base text-[#6B5246] mb-6 leading-relaxed max-w-[420px]">
                  You are currently signed in with a <strong>Patron (Client)</strong> account. Each artist profile requires a dedicated artist account. To join as an artist, please sign out first or register with an artist account.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => void handleSignOutAndJoin()}
                    className="flex-1 rounded-full bg-[#E7A042] px-6 py-3.5 font-mono text-xs font-semibold tracking-wider text-[#2A1D18] border border-[#B08D57] shadow-sm hover:bg-[#deb332] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut size={14} /> SIGN OUT & JOIN AS ARTIST
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full border border-[#B08D57]/60 px-5 py-3.5 font-mono text-xs tracking-wider text-[#8A6D3B] hover:bg-[#B08D57]/10 transition-colors cursor-pointer"
                  >
                    STAY AS PATRON
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function JoinArtistButton({
  className,
  style,
  label = "JOIN THE HOUSE →",
}: {
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={() => openJoinArtistModal()}
    >
      {label}
    </button>
  );
}
