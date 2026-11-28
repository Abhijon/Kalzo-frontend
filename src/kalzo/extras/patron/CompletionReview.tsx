import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api, unwrapData } from "@/lib/api";
import { VintageFilterSelect } from "../VintageFilterSelect";
import "../vintage-dropdowns.css";
import { REVIEW_TAGS, collectReviewTags } from "./reviewTags";

export function CompletionReview({
  booking,
  onSaved,
}: {
  booking: string;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState("");
  const [body, setBody] = useState("");
  const [rTags, setRTags] = useState<Record<string, boolean>>({});
  const [customTag, setCustomTag] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="kl-form kb-review-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const tags = collectReviewTags(rTags, customTag);
          const res = await api.reviews.create(booking, {
            rating: Number(rating),
            body: body.trim(),
            tags,
          });
          if (res.error) throw new Error(res.error.message);
          unwrapData(res.data);
          onSaved();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save review.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>One final bow · rating &amp; review required</h3>
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
      <fieldset className="kb-review-tags">
        <legend>Tags</legend>
        <div className="kb-review-tag-row" role="group" aria-label="Review tags">
          {REVIEW_TAGS.map((t) => {
            const on = !!rTags[t];
            return (
              <button
                key={t}
                type="button"
                className={"kpill" + (on ? " is-on" : "")}
                aria-pressed={on}
                onClick={() => {
                  setRTags((prev) => {
                    const next = { ...prev };
                    if (next[t]) delete next[t];
                    else next[t] = true;
                    return next;
                  });
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
        <label className="kb-review-custom-tag">
          Custom tag
          <input
            type="text"
            value={customTag}
            maxLength={40}
            placeholder="Add your own tag"
            onChange={(e) => setCustomTag(e.target.value)}
          />
        </label>
      </fieldset>
      <label>
        Your review *
        <textarea
          required
          value={body}
          maxLength={2000}
          rows={3}
          onChange={(e) => setBody(e.target.value)}
          placeholder="How was the performance?"
        />
      </label>
      <Button disabled={busy || !rating || !body.trim()} type="submit">
        {busy ? "Saving…" : "Complete your review"}
      </Button>
      {error ? (
        <p role="alert" className="kl-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
