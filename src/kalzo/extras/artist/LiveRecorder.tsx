import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Check, ScanFace, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FACE_SECONDS, VENUE_SECONDS } from "./flowRules";

/** Prefer a type multer accepts; Chrome’s default is often video/x-matroska. */
function pickRecorderMime(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function normalizeUploadMime(mime: string): string {
  const base = ((mime || "").split(";")[0] ?? "").trim().toLowerCase();
  if (base === "video/mp4" || base === "video/quicktime") return base;
  // Treat matroska / empty as webm for upload Content-Type
  return "video/webm";
}

export function LiveRecorder({ kind, busy, onDone }: { kind: "face" | "venue"; busy: boolean; onDone: (blob: Blob) => Promise<void> }) {
  const seconds = kind === "face" ? FACE_SECONDS : VENUE_SECONDS;
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [clip, setClip] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeStream = useRef<MediaStream | null>(null);
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    if (recorder.current?.state === "recording") { recorder.current.onstop = null; recorder.current.stop(); }
    activeStream.current?.getTracks().forEach((track) => track.stop());
  }, []);
  useEffect(() => {
    if (!clip) { setUrl(""); return; }
    const next = URL.createObjectURL(clip); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [clip]);
  async function start() {
    setError(""); setClip(null);
    let media: MediaStream | null = null;
    try {
      media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: kind === "face" ? "user" : "environment" }, audio: true });
      activeStream.current = media;
      const mimeType = pickRecorderMime();
      const rec = mimeType ? new MediaRecorder(media, { mimeType }) : new MediaRecorder(media);
      recorder.current = rec;
      const chunks: Blob[] = [];
      rec.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      rec.onstop = () => {
        activeStream.current?.getTracks().forEach((track) => track.stop());
        setStream(null); setRemaining(0);
        const raw = rec.mimeType || mimeType || "video/webm";
        setClip(new Blob(chunks, { type: normalizeUploadMime(raw) }));
      };
      setStream(media); setRemaining(seconds); rec.start();
      let left = seconds;
      timer.current = setInterval(() => {
        left -= 1; setRemaining(left);
        if (left <= 0) { if (timer.current) clearInterval(timer.current); if (rec.state === "recording") rec.stop(); }
      }, 1000);
    } catch {
      media?.getTracks().forEach((track) => track.stop()); setStream(null);
      setError("Allow camera and microphone access, then try recording again.");
    }
  }
  const elapsed = seconds - remaining;
  const cue = kind === "face" ? elapsed < 3 ? "Look straight at the camera" : elapsed < 6 ? "Slowly turn your head left and right" : "Blink your eyes, then look forward" : "Show the venue and your performance space";
  return <div className="ka-live-recorder">
    {!stream && !url && <div className="ka-record-guide"><span className="ka-face-guide">{kind === "face" ? <ScanFace size={54} /> : <Video size={54} />}</span><strong>{kind === "face" ? "Look forward · turn · blink" : "Show your venue"}</strong><small>{seconds}-second live recording</small></div>}
    {stream && <><video aria-label="Live camera" autoPlay muted playsInline ref={(el) => { if (el && el.srcObject !== stream) el.srcObject = stream; }} /><p role="status">{remaining}s · {cue}</p><progress max={seconds} value={elapsed} /></>}
    {url && <video aria-label="Recorded video preview" src={url} controls playsInline />}
    <div className="kl-actions">
      <Button variant="outline" disabled={busy || !!stream} onClick={() => void start()}>{url ? <RotateCcw size={16} /> : <Camera size={16} />}{url ? "Record again" : `Record live ${kind === "face" ? "face" : "venue"} video`}</Button>
      {clip && <Button disabled={busy} onClick={async () => { setError(""); try { await onDone(clip); setClip(null); } catch { setError("Video could not be submitted. Try again."); } }}><Check size={16} />{busy ? "Submitting…" : "Submit clip"}</Button>}
    </div>
    {error && <p role="alert" className="kl-error">{error}</p>}
  </div>;
}