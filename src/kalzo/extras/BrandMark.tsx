import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import logoImg from "@/assets/kalzo-logo.png";

export function BrandMark({ onHome }: { onHome?: () => void }) {
  return (
    <button type="button" onClick={onHome} aria-label="Kalzo home" className="kbrand">
      <img
        src={logoImg}
        alt="Kalzo logo"
        className="kbrand-logo"
      />
      <span className="kbrand-tag">where every mehfil finds its artist</span>
    </button>
  );
}

export const COUNT_START = 0;
export const COUNT_EPOCH = 0;
export const COUNT_STEP_MS = 1;
export function houseCount(enrolled: number) { return Math.max(0, Math.floor(enrolled)); }
export function HouseCounter(_: { start?: number }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const read = async () => {
      const { data, error } = await api.rpc("kalzo_enrollment_count");
      if (!error && typeof data === "number") setCount(data);
    };
    void read();
    const timer = setInterval(() => void read(), 30000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="kcount">
      <span className="kcount-num">{count === null ? "—" : houseCount(count).toLocaleString("en-IN")}</span>
      <span className="kcount-label">real artist profiles enrolled · sample excluded</span>
    </div>
  );
}

import word from "@/assets/kalzo-word-final.png";
/** The KALZO name, drawn exactly as in the logo. height = font-size equivalent. */
export function KalzoWord({ size = "1em", tone = "bronze" }: { size?: string; tone?: string }) {
  return <img src={word} alt="KALZO" className={"kword kword-" + tone} style={{ height: size }} />;
}
