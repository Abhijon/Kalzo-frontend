import "./profile-card.css";

const PLAQUE =
  "https://kalzo.in/__l5e/assets-v1/c690a25a-cd3b-4fb5-956a-fd2bf8e813cc/kalzo-profile-plaque.png";

type Props = {
  photoUrl?: string;
  artUrl?: string;
  stageName?: string;
  art?: string;
  baseCity?: string;
  rateInr?: number;
  pricingUnit?: string;
  status?: string;
};

export function ProfileCard({
  photoUrl,
  artUrl,
  stageName,
  art = "Musicians",
  baseCity,
  rateInr,
  pricingUnit = "hour",
  status = "not_started",
}: Props) {
  return (
    <section
      className="kp-plaque"
      aria-label="Profile preview"
      style={{ backgroundImage: `url(${PLAQUE})` }}
    >
      <div className="kp-photo">
        {photoUrl ? <img src={photoUrl} alt="You" /> : <span>Your photo</span>}
      </div>
      <div className="kp-art">
        {artUrl ? <img src={artUrl} alt="Your art" /> : <span>Art</span>}
      </div>
      <i className="kp-badge">{status.replaceAll("_", " ")}</i>
      <div className="kp-text">
        <small>Stage Name:</small>
        <strong>{stageName || "Your stage name"}</strong>
        <p>
          <span>Art:</span>
          <em>{art || "—"}</em>
        </p>
        <p>
          <span>Base City:</span>
          <em>{baseCity || "Base city"}</em>
        </p>
        <p>
          <span>Rate:</span>
          <b>
            {rateInr
              ? `₹${rateInr.toLocaleString("en-IN")} / ${pricingUnit}`
              : `— / ${pricingUnit}`}
          </b>
        </p>
      </div>
    </section>
  );
}
