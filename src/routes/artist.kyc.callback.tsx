import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, artistFrom, unwrapData } from "@/lib/api";
import {
  clearDigilockerClientId,
  readDigilockerClientId,
} from "@/kalzo/extras/digilocker";
import { kalzoHead } from "@/lib/routeHead";

export const Route = createFileRoute("/artist/kyc/callback")({
  head: () =>
    kalzoHead(
      "Digilocker verification",
      "Finishing your Digilocker Aadhaar check for Kalzo.",
      true,
    ),
  staticData: { sitemap: false },
  component: DigilockerCallback,
});

function DigilockerCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Confirming Digilocker verification…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const clientId = readDigilockerClientId();
      if (!clientId) {
        // Webhook may already have completed — check status.
        const statusRes = await api.kyc.getStatus();
        const kyc = unwrapData(statusRes.data) as { kyc?: { kycStatus?: string; kyc_status?: string } } | null;
        const status =
          (kyc as any)?.kyc?.kycStatus ??
          (kyc as any)?.kyc?.kyc_status ??
          (kyc as any)?.kycStatus ??
          "";
        if (!cancelled && status === "success") {
          clearDigilockerClientId();
          setMessage("Digilocker verified. Returning to your profile…");
          navigate({ to: "/artist/profile" });
          return;
        }
        if (!cancelled) {
          setFailed(true);
          setMessage("Missing Digilocker session. Start the check again from your profile.");
        }
        return;
      }

      const res = await api.kyc.completeDigilocker(clientId);
      if (cancelled) return;
      if (res.error) {
        setFailed(true);
        setMessage(res.error.message || "Could not finish Digilocker verification.");
        return;
      }

      clearDigilockerClientId();
      const profile = artistFrom(res.data);
      setMessage(
        profile?.kyc_verified_name
          ? `Verified as ${profile.kyc_verified_name}. Returning to your profile…`
          : "Digilocker verified. Returning to your profile…",
      );
      navigate({ to: "/artist/profile" });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <section className="ka-card" aria-live="polite">
      <h2>Digilocker Aadhaar check</h2>
      <p className={failed ? "ka-field-error" : "kl-note"}>{message}</p>
      {failed && (
        <p>
          <a href="/artist/profile">Back to profile</a>
        </p>
      )}
    </section>
  );
}
