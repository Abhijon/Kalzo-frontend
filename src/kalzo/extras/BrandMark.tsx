import logoImg from "@/assets/kalzo-logo.png";

export function BrandMark({
  onHome,
  compact = false,
}: {
  onHome?: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onHome}
      aria-label="Kalzo home"
      className={compact ? "kbrand kbrand-compact" : "kbrand"}
    >
      <img src={logoImg} alt="Kalzo logo" className="kbrand-logo" />
      {!compact && (
        <span className="kbrand-tag">where every mehfil finds its artist</span>
      )}
    </button>
  );
}

export const COUNT_START = 0;
export const COUNT_EPOCH = 0;
export const COUNT_STEP_MS = 1;
export function houseCount(enrolled: number) { return Math.max(0, Math.floor(enrolled)); }
/** Enrollment RPC removed with Supabase; show placeholder until a Node count endpoint exists. */
export function HouseCounter(_: { start?: number }) {
  return (
    <div className="kcount">
      <span className="kcount-num">—</span>
      <span className="kcount-label">real artist profiles enrolled · sample excluded</span>
    </div>
  );
}

import word from "@/assets/kalzo-word-final.png";
/** The KALZO name, drawn exactly as in the logo. height = font-size equivalent. */
export function KalzoWord({ size = "1em", tone = "bronze" }: { size?: string; tone?: string }) {
  return <img src={word} alt="KALZO" className={"kword kword-" + tone} style={{ height: size }} />;
}
