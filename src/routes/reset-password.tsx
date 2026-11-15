import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import "../kalzo/kalzo.css";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "Set a new password — Kalzo" },
    { name: "description", content: "Choose a new password for your Kalzo account." },
    { property: "og:title", content: "Set a new password — Kalzo" },
    { property: "og:description", content: "Choose a new password for your Kalzo account." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState(""), [msg, setMsg] = useState("");
  const save = async () => {
    if (pw.length < 8) return setMsg("Use at least 8 characters.");
    const { error } = await api.auth.updateUser({ password: pw });
    setMsg(error ? error.message : "Password updated. You're signed in.");
  };
  return (
    <main className="kx-page">
      <h1 className="kx-h3">Set a new password</h1>
      <input className="kx-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="New password" />
      <button className="kx-btn" onClick={save}>SAVE PASSWORD</button>
      {msg && <p className="kx-small" role="status">{msg}</p>}
      <Link to="/" className="kx-small">← Back to Kalzo</Link>
    </main>
  );
}
