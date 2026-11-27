import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { saveReview } from "@/lib/patron.functions";
import { VintageFilterSelect } from "../VintageFilterSelect";
import "../vintage-dropdowns.css";

export function CompletionReview({ booking, onSaved }: { booking: string; onSaved: () => void }) {
  const save = useServerFn(saveReview);
  const [rating, setRating] = useState(""),
    [body, setBody] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="kl-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await save({ data: { booking, rating: Number(rating), body } });
          onSaved();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save review.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>One final bow · rating & review required</h3>
      <label>
        Your rating *
        <VintageFilterSelect
          variant="field"
          aria-label="Your rating"
          value={rating}
          options={[
            { value: "", label: "Select rating" },
            ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}/5` })),
          ]}
          onChange={(e) => setRating(e.target.value)}
        />
      </label>
      <label>
        Your review *
        <textarea
          required
          value={body}
          maxLength={2000}
          rows={3}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <Button disabled={busy || !rating || !body.trim()} type="submit">
        {busy ? "Saving…" : "Complete your review"}
      </Button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
