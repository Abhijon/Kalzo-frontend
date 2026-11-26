import type { ReactNode } from "react";
import paper from "@/assets/vintage-panel-paper.png.asset.json";
import "./ArtistPanelBackground.css";

const PAPER_TEXTURE =
  typeof paper.url === "string" && paper.url.startsWith("http")
    ? paper.url
    : `https://kalzo.in${paper.url}`;

export default function ArtistPanelBackground({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <main className="artist-panel-background">
      <img
        className="artist-paper-texture"
        src={PAPER_TEXTURE}
        alt=""
        aria-hidden="true"
      />

      <div className="artist-lamps" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="artist-lamp" key={index}>
            <svg viewBox="0 0 60 200">
              <path d="M30 0v85M20 85h20l10 65H10zM15 155h30M23 165h14" />
              <path
                className="artist-lamp-flame"
                d="M30 108c-14 18-11 29 0 34 11-5 14-16 0-34z"
              />
            </svg>
          </div>
        ))}
      </div>

      <div className="artist-panel-content">{children}</div>
    </main>
  );
}
