import type { FC } from "react";
import wordUrl from "@/assets/kalzo-word-final.png";

/* The bronze KALZO lettering, used wherever the brand's own lettering should
   appear instead of the icon mark. `tone` picks the reveal treatment. */
const KalzoWord: FC<{ size?: string; tone?: string }> = ({
  size = "1em",
  tone = "bronze",
}) => (
  <span
    aria-label="Kalzo"
    role="img"
    className={"kword kword-" + tone}
    style={{
      display: "inline-block",
      lineHeight: 0,
      fontSize: size,
    }}
  >
    <img
      alt=""
      src={wordUrl}
      style={{
        display: "block",
        width: "7.6em",
        height: "auto",
        filter: "drop-shadow(0 6px 18px rgba(20,8,4,.55))",
      }}
    />
  </span>
);

export default KalzoWord;
