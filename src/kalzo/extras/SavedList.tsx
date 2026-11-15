import { useState } from "react";

export type SavedItem = {
  id: string;
  name: string;
  craft: string;
  place: string;
  rateText: string;
  unit: string;
  photo: string;
  rating: string;
  reviews: number;
  list: "look" | "book";
  book: () => void;
  look: () => void;
  toBook: () => void;
  remove: () => void;
};

function Row({ item }: { item: SavedItem }) {
  const toBook = item.list !== "book";
  return (
    <li className="ksl-row">
      <img className="ksl-photo" src={item.photo} alt={item.name} />
      <div className="ksl-who">
        <p className="ksl-name">{item.name}</p>
        <p className="ksl-meta">{item.craft} · {item.place}</p>
        <p className="ksl-rate">{item.rateText} {item.unit} · ★ {item.rating} ({item.reviews})</p>
      </div>
      <div className="ksl-acts">
        <button type="button" className="kx-btn" onClick={item.book}>BOOK NOW</button>
        <button type="button" className="kx-btn kx-ghost" onClick={toBook ? item.toBook : item.look}>
          {toBook ? "＋ TO BOOK" : "★ TO LOOK"}
        </button>
        <button type="button" className="ksl-x" onClick={item.remove} aria-label={`Remove ${item.name} from your list`}>✕</button>
      </div>
    </li>
  );
}

export function SavedList({ items }: { items: SavedItem[] }) {
  const [tab, setTab] = useState<"all" | "look" | "book">("all");
  const look = items.filter((i) => i.list === "look");
  const book = items.filter((i) => i.list === "book");
  const shown = tab === "look" ? look : tab === "book" ? book : items;

  return (
    <section className="ksl" aria-label="Your saved artists">
      <header className="ksl-head">
        <p className="kx-eyebrow">KEEP THEM SIDE BY SIDE</p>
        <h3 className="kx-h3">Your list</h3>
        <div className="ksl-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "ksl-on" : ""} onClick={() => setTab("all")}>
            ALL · {items.length}
          </button>
          <button type="button" role="tab" aria-selected={tab === "look"} className={tab === "look" ? "ksl-on" : ""} onClick={() => setTab("look")}>
            TO LOOK · {look.length}
          </button>
          <button type="button" role="tab" aria-selected={tab === "book"} className={tab === "book" ? "ksl-on" : ""} onClick={() => setTab("book")}>
            TO BOOK · {book.length}
          </button>
        </div>
      </header>
      {shown.length === 0 ? (
        <p className="ksl-empty">Nothing here yet — tap the heart on an artist to keep them for later, or the ticket to line them up for booking.</p>
      ) : (
        <ul className="ksl-list">
          {shown.map((item) => <Row key={item.id} item={item} />)}
        </ul>
      )}
    </section>
  );
}
