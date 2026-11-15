import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Mic, Music, Drum, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Favourite = { artist_id: string; list: string; stage_name: string | null; discipline: string; base_city: string | null; rate_inr: number | null };
const icon = (d: string) => (/sing|vocal|ghazal|sufi/i.test(d) ? Mic : /danc/i.test(d) ? Sparkles : /drum|tabla|percuss/i.test(d) ? Drum : Music);

export function FavouriteSalon({ favorites }: { favorites: Favourite[] }) {
  const categories = ["All", ...Array.from(new Set(favorites.map((f) => f.discipline)))];
  const [cat, setCat] = useState("All");
  const list = favorites.filter((f) => cat === "All" || f.discipline === cat);
  return (
    <section className="kf-salon">
      <div className="kf-lamps" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <span key={i} />)}</div>
      <header>
        <Heart className="kf-heart" />
        <h2>Your favourite kalakars</h2>
        <p>{favorites.length} saved across {categories.length - 1} {categories.length === 2 ? "category" : "categories"}</p>
      </header>
      {favorites.length > 0 && (
        <nav className="kf-cats">
          {categories.map((c) => (
            <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>
              {c} ({c === "All" ? favorites.length : favorites.filter((f) => f.discipline === c).length})
            </Button>
          ))}
        </nav>
      )}
      {list.length ? (
        <div className="kf-grid">
          {list.map((f, i) => {
            const I = icon(f.discipline);
            return (
              <article className="kf-card" key={f.artist_id} style={{ animationDelay: `${i * 90}ms` }}>
                <span className="kf-medal"><I size={20} /></span>
                <small>{f.discipline}</small>
                <h3>{f.stage_name ?? "Kalzo artist"}</h3>
                <p>{f.base_city ?? "City not shared"}{f.rate_inr ? ` · ₹${f.rate_inr.toLocaleString("en-IN")}/hr` : ""}</p>
                <i>{f.list === "book" ? "To book" : "To look later"}</i>
                <Link to="/">View on Kalzo →</Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="kf-empty">
          <div className="kf-card-float" aria-hidden="true"><Heart /></div>
          <h3>Your favourites await</h3>
          <p>Save verified artists from their profile to compare and book later.</p>
          <Link to="/">Find artists →</Link>
        </div>
      )}
    </section>
  );
}
