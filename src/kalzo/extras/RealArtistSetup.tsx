import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { api, artistFrom } from "@/lib/api";
import { uploadArtistMedia, type UploadPurpose } from "@/lib/directUpload";
import {
  type ArtistProfileAlert,
  type ArtistProfileField,
  validateArtistProfileSubmit,
} from "./launchRules";
import { OTHER } from "./artist/rules";
import { getCachedArtForms, loadArtForms } from "./artist/artFormsCatalog";
import { LocationSelect, PreferredCities, stateForCity } from "./artist/LocationFields";
import { VintageFilterSelect } from "./VintageFilterSelect";
import "./vintage-dropdowns.css";
import { loadLocations } from "./artist/locationsCatalog";
import { CityPricing } from "./artist/CityPricing";
import { normalizedCityRate, cityRateSchema, type CityRate } from "./artist/flowRules";
import { LiveRecorder } from "./artist/LiveRecorder";
import { digilockerSessionFrom, openDigilockerSession } from "./digilocker";
import {
  clearArtistProfileDraft,
  loadArtistProfileDraft,
  saveArtistProfileDraft,
} from "./artistProfileDraft";
import {
  Plane,
  BedDouble,
  CircleAlert,
  CircleCheck,
  Info,
  Edit3,
  X,
  Trash2,
  Image as ImageIcon,
  Video as VideoIcon,
  ExternalLink,
} from "lucide-react";
import { ProfileCard } from "./artist/ProfileCard";

type PendingFiles = {
  photo: File | null;
  artPhoto: File | null;
  faceVideo: Blob | null;
  reels: (File | null)[];
};

type UploadedKeys = {
  photo: string | null;
  artPhoto: string | null;
  faceVideo: string | null;
  reels: (string | null)[];
};

type SlotStatus = "idle" | "uploading" | "ready" | "error";

type MediaStatus = {
  photo: SlotStatus;
  artPhoto: SlotStatus;
  faceVideo: SlotStatus;
  reels: SlotStatus[];
};

type UploadProgress = {
  photo: number | null;
  artPhoto: number | null;
  faceVideo: number | null;
  reels: (number | null)[];
};

const emptyFiles = (): PendingFiles => ({
  photo: null,
  artPhoto: null,
  faceVideo: null,
  reels: [null, null, null, null],
});

const emptyKeys = (): UploadedKeys => ({
  photo: null,
  artPhoto: null,
  faceVideo: null,
  reels: [null, null, null, null],
});

const emptyMediaStatus = (): MediaStatus => ({
  photo: "idle",
  artPhoto: "idle",
  faceVideo: "idle",
  reels: ["idle", "idle", "idle", "idle"],
});

const emptyUploadProgress = (): UploadProgress => ({
  photo: null,
  artPhoto: null,
  faceVideo: null,
  reels: [null, null, null, null],
});

function UploadPctOverlay({ ratio }: { ratio: number | null }) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio ?? 0)) * 100);
  return (
    <div className="ka-upload-overlay" role="status" aria-live="polite" aria-label={`Uploading ${pct}%`}>
      <strong>{pct}%</strong>
      <span>Uploading</span>
      <div className="ka-upload-bar" aria-hidden>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const MAX_MEDIA_BYTES = 100 * 1024 * 1024;

function normalizeFaceBlob(raw: Blob): File {
  const faceBase = ((raw.type || "video/webm").split(";")[0] ?? "video/webm")
    .trim()
    .toLowerCase();
  const faceType =
    faceBase === "video/mp4" || faceBase === "video/quicktime" ? faceBase : "video/webm";
  if (raw instanceof File && raw.type === faceType) return raw;
  const ext =
    faceType === "video/mp4" ? "mp4" : faceType === "video/quicktime" ? "mov" : "webm";
  return new File([raw], `face.${ext}`, { type: faceType });
}

function normalizeReelFile(reel: File): File {
  const base = ((reel.type || "").split(";")[0] ?? "").trim().toLowerCase();
  if (["video/mp4", "video/webm", "video/quicktime"].includes(base)) return reel;
  const ext = reel.name.match(/\.(mp4|webm|mov)$/i)?.[1]?.toLowerCase() ?? "mp4";
  const type =
    ext === "webm" ? "video/webm" : ext === "mov" ? "video/quicktime" : "video/mp4";
  return new File([reel], reel.name || `reel.${ext}`, { type });
}

const empty = {
  stage_name: "",
  legal_name: "",
  current_state: "",
  preferred_states: [] as string[],
  discipline: "Musicians",
  subcategory: "",
  bio: "",
  base_city: "",
  state_name: "",
  current_city: "",
  rate_inr: 0,
  instagram: "",
  photo_path: "",
  art_photo_path: "",
  face_video_path: "",
  reels: [] as string[],
  primary_reel: 0,
  pricing_unit: "hour" as "hour" | "event" | "plate",
  travel_setting: "including" as "including" | "excluding" | "none",
  travel_charge_inr: 0,
  stay_charge_inr: 0,
  preferred_cities: [] as string[],
  city_rates: {} as Record<string, CityRate>,
  bank_account_holder: "",
  bank_name: "",
  bank_account_number: "",
  bank_ifsc: "",
};

function localPreviewKey(kind: string, index?: number) {
  return index === undefined ? `local:${kind}` : `local:reel:${index}`;
}

const FIELD_CLEAR_MAP: Partial<Record<keyof typeof empty, ArtistProfileField>> = {
  stage_name: "stage_name",
  legal_name: "legal_name",
  base_city: "base_city",
  state_name: "state_name",
  current_city: "current_city",
  current_state: "current_state",
  preferred_cities: "preferred_cities",
  discipline: "discipline",
  subcategory: "subcategory",
  bio: "bio",
  instagram: "instagram",
  rate_inr: "rate_inr",
  travel_setting: "travel_setting",
  travel_charge_inr: "travel_charge_inr",
  stay_charge_inr: "stay_charge_inr",
  primary_reel: "primary_reel",
  bank_account_holder: "bank_account_holder",
  bank_name: "bank_name",
  bank_account_number: "bank_account_number",
  bank_ifsc: "bank_ifsc",
};

function ProfileAlertBanner({
  alert,
  onDismiss,
}: {
  alert: ArtistProfileAlert;
  onDismiss?: () => void;
}) {
  const Icon = alert.kind === "error" ? CircleAlert : alert.kind === "success" ? CircleCheck : Info;
  return (
    <div
      className={`ka-alert ka-alert-${alert.kind}`}
      role={alert.kind === "error" ? "alert" : "status"}
      aria-live={alert.kind === "error" ? "assertive" : "polite"}
      style={{
        position: "relative",
        paddingRight: onDismiss ? 44 : undefined,
        margin: "16px 0",
      }}
    >
      <Icon size={20} aria-hidden="true" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <strong>{alert.title}</strong>
        <p style={{ margin: "2px 0 0" }}>{alert.message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          style={{
            position: "absolute",
            top: 10,
            right: 12,
            background: "transparent",
            border: 0,
            cursor: "pointer",
            padding: 4,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "currentColor",
            opacity: 0.7,
            borderRadius: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function FieldError({
  id,
  message,
}: {
  id?: string | undefined;
  message?: string | undefined;
}) {
  if (!message) return null;
  return (
    <p id={id} className="ka-field-error" role="alert">
      {message}
    </p>
  );
}

function maskAccount(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 4) return "*".repeat(digits.length);
  return `${digits.slice(0, 4)}${"*".repeat(digits.length - 4)}`;
}

function maskIfsc(value: string) {
  const code = String(value || "").toUpperCase();
  if (code.length < 4) return code;
  return `${code.slice(0, 4)}${"*".repeat(Math.max(0, code.length - 4))}`;
}

/** Profile already exists in the backend database. */
function isSubmittedProfile(a: {
  id?: string;
  stage_name?: string;
  discipline?: string;
  bio?: string;
  photo_path?: string;
  face_video_path?: string;
  reels?: unknown;
  bank_account_number?: string;
  verification_status?: string;
}) {
  const reels = Array.isArray(a.reels) ? a.reels.filter((r) => typeof r === "string" && r) : [];
  return Boolean(
    a.stage_name?.trim() ||
    a.discipline?.trim() ||
    a.bio?.trim() ||
    a.photo_path ||
    a.face_video_path ||
    reels.length > 0 ||
    a.bank_account_number ||
    (a.verification_status && a.verification_status !== "unverified"),
  );
}

function ProfileDetailsOverview({
  form,
  previewSrc,
  verification,
  kycStatus,
  kycMasked,
  onEdit,
}: {
  form: typeof empty;
  previewSrc: (path: string | undefined) => string;
  verification: string;
  kycStatus: string;
  kycMasked: string;
  onEdit: () => void;
}) {
  const photoUrl = previewSrc(form.photo_path);
  const artPhotoUrl = previewSrc(form.art_photo_path);
  const activeReels = [0, 1, 2, 3]
    .map((i) => ({ index: i, key: form.reels[i], url: previewSrc(form.reels[i]) }))
    .filter((r) => Boolean(r.key || r.url));

  return (
    <div className="ka-profile-overview" style={{ display: "grid", gap: 24, margin: "16px 0 32px" }}>
      <ProfileCard
        photoUrl={photoUrl || undefined}
        artUrl={artPhotoUrl || undefined}
        stageName={form.stage_name}
        art={form.subcategory || form.discipline || "Musicians"}
        baseCity={form.base_city}
        rateInr={form.rate_inr || undefined}
        pricingUnit={form.pricing_unit || "hour"}
        status={verification}
      />

      {/* Who you are */}
      <fieldset className="ka-card">
        <legend>Who you are</legend>
        <div className="kl-form">
          <div>
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
              Stage name
            </span>
            <span style={{ display: "block", fontSize: 18, fontWeight: 500, color: "var(--artist-black-ink, #1f1d1a)" }}>{form.stage_name || "—"}</span>
          </div>
          <div>
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
              Name as per Aadhaar
            </span>
            <span style={{ display: "block", fontSize: 18, fontWeight: 500, color: "var(--artist-black-ink, #1f1d1a)" }}>{form.legal_name || "—"}</span>
          </div>
          <div>
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
              Art form
            </span>
            <span style={{ display: "block", fontSize: 18, fontWeight: 500, color: "var(--artist-black-ink, #1f1d1a)" }}>{form.discipline || "—"}</span>
          </div>
          <div>
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
              Performance category
            </span>
            <span style={{ display: "block", fontSize: 18, fontWeight: 500, color: "var(--artist-black-ink, #1f1d1a)" }}>{form.subcategory || "—"}</span>
          </div>
          <div className="kl-full">
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
              Instagram profile
            </span>
            {form.instagram ? (
              <a
                href={form.instagram}
                target="_blank"
                rel="noreferrer noopener"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 16, color: "var(--desk-ink, inherit)", textDecoration: "underline", wordBreak: "break-all" }}
              >
                {form.instagram}
                <ExternalLink size={15} />
              </a>
            ) : (
              <em style={{ color: "var(--artist-muted, #777)", fontSize: 15 }}>No Instagram linked</em>
            )}
          </div>
          <div className="kl-full">
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
              About you and your act
            </span>
            {form.bio ? (
              <p style={{ margin: "4px 0 0", fontSize: 16, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "Newsreader, Georgia, serif" }}>
                {form.bio}
              </p>
            ) : (
              <em style={{ color: "var(--artist-muted, #777)", fontSize: 15 }}>No biography written yet.</em>
            )}
          </div>
        </div>
      </fieldset>

      {/* The value of your performance */}
      <fieldset className="ka-card">
        <legend>The value of your performance</legend>
        <div className="kl-form">
          <div>
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
              Hourly performance rate
            </span>
            <div style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 20, fontWeight: 500, color: "var(--desk-ink, inherit)" }}>
              {form.rate_inr ? `₹${form.rate_inr.toLocaleString("en-IN")}` : "Not set"} <span style={{ fontSize: 14, fontFamily: "Newsreader, serif", fontWeight: 400, color: "var(--artist-muted, #777)" }}>/ {form.pricing_unit || "hour"}</span>
            </div>
          </div>
          <div>
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
              Travel and stay policy
            </span>
            <span style={{ display: "block", fontSize: 17, fontWeight: 500, color: "var(--artist-black-ink, inherit)" }}>
              {form.travel_setting === "including"
                ? "Included in hourly rate"
                : form.travel_setting === "excluding"
                  ? "Charged separately"
                  : "Not required"}
            </span>
          </div>
          {form.travel_setting === "excluding" && (
            <>
              <div>
                <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
                  Travel charges
                </span>
                <span style={{ display: "block", fontFamily: "Newsreader, Georgia, serif", fontSize: 18, fontWeight: 500 }}>
                  ₹{(form.travel_charge_inr || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
                  Stay charges
                </span>
                <span style={{ display: "block", fontFamily: "Newsreader, Georgia, serif", fontSize: 18, fontWeight: 500 }}>
                  ₹{(form.stay_charge_inr || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </>
          )}
          {form.city_rates && Object.keys(form.city_rates).length > 0 && (
            <div className="kl-full" style={{ borderTop: "1px solid var(--artist-border, #ddd)", paddingTop: 14, marginTop: 6 }}>
              <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 10 }}>
                Specific city rates
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {Object.entries(form.city_rates).map(([city, rateObj]) => (
                  <div
                    key={city}
                    style={{
                      padding: "6px 14px",
                      border: "1.5px solid var(--desk-brass, #b48a4a)",
                      borderRadius: 6,
                      background: "var(--artist-paper, #fff)",
                      fontSize: 14,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{city}:</span>{" "}
                    <span style={{ fontWeight: 500 }}>₹{rateObj.rate.toLocaleString("en-IN")}</span>{" "}
                    <small style={{ color: "var(--artist-rust, #888)", fontSize: 12 }}>
                      ({rateObj.travel === "separate" ? "separate travel" : rateObj.travel === "included" ? "travel included" : "no travel"})
                    </small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </fieldset>

      {/* Where you will perform */}
      <fieldset className="ka-card">
        <legend>Where you will perform</legend>
        <div className="kl-form">
          <div>
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
              Base origin
            </span>
            <span style={{ display: "block", fontSize: 17, fontWeight: 500 }}>{form.base_city}{form.state_name ? `, ${form.state_name}` : ""}</span>
          </div>
          <div>
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
              Current location
            </span>
            <span style={{ display: "block", fontSize: 17, fontWeight: 500 }}>{form.current_city}{form.current_state ? `, ${form.current_state}` : ""}</span>
          </div>
          <div className="kl-full">
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 8 }}>
              Preferred performing cities
            </span>
            {form.preferred_cities && form.preferred_cities.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {form.preferred_cities.map((city) => (
                  <span
                    key={city}
                    style={{
                      padding: "5px 12px",
                      background: "var(--artist-paper, #fff)",
                      border: "1.5px solid var(--desk-brass, #ccc)",
                      borderRadius: 20,
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {city}
                  </span>
                ))}
              </div>
            ) : (
              <em style={{ color: "var(--artist-muted, #777)", fontSize: 15 }}>Base city only</em>
            )}
          </div>
        </div>
      </fieldset>

      {/* Photographs and showreels */}
      <fieldset className="ka-card">
        <legend>Photographs and showreels</legend>
        <div style={{ paddingBottom: 24, marginBottom: 24, borderBottom: "1px solid var(--artist-border, #ddd)" }}>
          <span style={{ display: "block", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 700, marginBottom: 12 }}>
            Attached photographs
          </span>
          <div className="ka-photos">
            <div className="ka-drop round" style={{ cursor: "default" }}>
              {photoUrl ? (
                <img src={photoUrl} alt="Profile portrait" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <ImageIcon size={28} />
                  <span style={{ fontSize: 12 }}>No portrait</span>
                </div>
              )}
            </div>
            <div className="ka-drop round" style={{ cursor: "default" }}>
              {artPhotoUrl ? (
                <img src={artPhotoUrl} alt="Art photography" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <ImageIcon size={28} />
                  <span style={{ fontSize: 12 }}>No art photo</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ paddingTop: 4 }}>
          <span style={{ display: "block", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 700, marginBottom: 12 }}>
            Performance showreels
          </span>
          {activeReels.length === 0 ? (
            <div
              style={{
                padding: "30px 16px",
                textAlign: "center",
                border: "2px dashed var(--artist-gold-deep, #c5a059)",
                borderRadius: 8,
                background: "var(--artist-wash)",
              }}
            >
              <VideoIcon size={32} style={{ margin: "0 auto 8px", color: "var(--artist-gold)" }} />
              <strong style={{ display: "block", fontSize: 16 }}>No showreels added yet</strong>
              <p style={{ margin: "4px 0 0", color: "var(--artist-rust)", fontSize: 14 }}>
                Showreels showcase your talent to prospective patrons.
              </p>
            </div>
          ) : (
            <div className="ka-reels">
              {[0, 1, 2, 3].map((i) => {
                const reelKey = form.reels[i];
                const reelSrc = previewSrc(reelKey);
                if (!reelKey && !reelSrc) {
                  return (
                    <div key={i} className="ka-reel" style={{ opacity: 0.65 }}>
                      <div
                        className="ka-reel-empty"
                        style={{
                          cursor: "default",
                          pointerEvents: "none",
                          width: "100%",
                          aspectRatio: "9 / 16",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "var(--artist-wash)",
                          border: "2px dashed var(--artist-border, #c5a059)",
                          borderRadius: 8,
                          boxSizing: "border-box",
                        }}
                      >
                        <VideoIcon size={24} style={{ color: "var(--artist-muted, #888)", marginBottom: 6 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--artist-ink, inherit)" }}>Reel {i + 1}</span>
                        <small style={{ color: "var(--artist-muted, #888)", fontSize: 11 }}>{i < 2 ? "Required" : "Optional"}</small>
                      </div>
                    </div>
                  );
                }
                const isPrimary = form.primary_reel === i;
                return (
                  <div key={i} className="ka-reel">
                    <div
                      className="ka-reel-preview"
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "9 / 16",
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#000",
                        border: isPrimary ? "3px solid var(--artist-gold, #c5a059)" : "2px solid var(--artist-border, #d1c7b7)",
                      }}
                    >
                      <video
                        key={reelSrc}
                        src={`${reelSrc}#t=0.1`}
                        controls
                        playsInline
                        preload="metadata"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, fontWeight: 500, padding: "2px 2px 0" }}>
                      <span>Reel {i + 1}</span>
                      {isPrimary && (
                        <span style={{ color: "var(--artist-rust, #b45309)", display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 600, fontSize: 12 }}>
                          ★ Primary
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </fieldset>

      {/* Identity verification and payouts */}
      <fieldset className="ka-card">
        <legend>Identity verification & payouts</legend>
        <div className="kl-form">
          <div>
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 6 }}>
              Verification status
            </span>
            <span
              style={{
                display: "inline-block",
                padding: "5px 14px",
                borderRadius: 99,
                border: "1.5px solid var(--desk-brass, #b48a4a)",
                background: "var(--desk-review, #fff)",
                fontSize: 13,
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {verification.replaceAll("_", " ")}
            </span>
          </div>
          <div>
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 6 }}>
              DigiLocker KYC
            </span>
            <span
              style={{
                display: "inline-block",
                padding: "5px 14px",
                borderRadius: 99,
                border: "1.5px solid var(--desk-brass, #b48a4a)",
                background: kycStatus === "success" ? "#e6f4ea" : "var(--desk-review, #fff)",
                color: kycStatus === "success" ? "#137333" : "inherit",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {kycStatus === "success" ? `Verified (${kycMasked || "Aadhaar"})` : kycStatus.replaceAll("_", " ")}
            </span>
          </div>
          <div>
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
              Bank account holder
            </span>
            <span style={{ display: "block", fontSize: 17, fontWeight: 500 }}>{form.bank_account_holder || "—"}</span>
          </div>
          <div>
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
              Bank name
            </span>
            <span style={{ display: "block", fontSize: 17, fontWeight: 500 }}>{form.bank_name || "—"}</span>
          </div>
          <div>
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
              Account number
            </span>
            <span style={{ display: "block", fontSize: 16, fontWeight: 500, letterSpacing: "0.04em", color: "var(--desk-ink, inherit)" }}>{form.bank_account_number || "•••• •••• ••••"}</span>
          </div>
          <div>
            <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 4 }}>
              IFSC code
            </span>
            <span style={{ display: "block", fontSize: 16, fontWeight: 500, letterSpacing: "0.04em", color: "var(--desk-ink, inherit)" }}>{form.bank_ifsc || "—"}</span>
          </div>
        </div>
      </fieldset>

      {/* Bottom CTA */}
      <div className="kl-actions" style={{ display: "flex", justifyContent: "center", margin: "32px 0 24px" }}>
        <Button size="lg" onClick={onEdit} style={{ minWidth: 240, height: 48, fontSize: 16 }}>
          <Edit3 size={18} style={{ marginRight: 8 }} />
          Update Profile Details
        </Button>
      </div>
    </div>
  );
}

export function ArtistProfileEditor() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const uploadGen = useRef({ photo: 0, artPhoto: 0, faceVideo: 0, reels: [0, 0, 0, 0] });
  const inflightUploads = useRef(new Set<Promise<void>>());
  const keysRef = useRef<UploadedKeys>(emptyKeys());
  const [form, setForm] = useState(empty);
  const [artForms, setArtForms] = useState<Record<string, string[]>>(getCachedArtForms);
  const [files, setFiles] = useState<PendingFiles>(emptyFiles);
  const [uploadedKeys, setUploadedKeys] = useState<UploadedKeys>(emptyKeys);
  const [mediaStatus, setMediaStatus] = useState<MediaStatus>(emptyMediaStatus);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>(emptyUploadProgress);
  const [alert, setAlert] = useState<ArtistProfileAlert | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ArtistProfileField, string>>>({});
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [submitted, setSubmitted] = useState(false),
    [preview, setPreview] = useState<Record<string, string>>({}),
    [verification, setVerification] = useState("unverified"),
    [kycStatus, setKycStatus] = useState("not_started"),
    [kycName, setKycName] = useState(""),
    [kycMasked, setKycMasked] = useState(""),
    [kycBusy, setKycBusy] = useState(false),
    [savedCity, setSavedCity] = useState(""),
    [cityAsk, setCityAsk] = useState<({ city: string } & CityRate) | null>(null),
    [customSub, setCustomSub] = useState(false),
    [isEditing, setIsEditing] = useState(false);

  const kycDone = kycStatus === "success";

  function setKeys(next: UploadedKeys | ((prev: UploadedKeys) => UploadedKeys)) {
    setUploadedKeys((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      keysRef.current = value;
      return value;
    });
  }

  async function discardUploadedKey(key: string | null | undefined) {
    if (!key) return;
    await api.media.discard({ key }).catch(() => {});
  }

  function trackUpload(job: Promise<void>) {
    inflightUploads.current.add(job);
    void job.finally(() => inflightUploads.current.delete(job));
  }

  async function waitForInflightUploads() {
    while (inflightUploads.current.size > 0) {
      await Promise.allSettled([...inflightUploads.current]);
    }
  }

  function queueDirectUpload(opts: {
    purpose: UploadPurpose;
    file: Blob;
    fileName?: string;
    slot: "photo" | "artPhoto" | "faceVideo" | { reel: number };
    previousKey: string | null;
  }) {
    const { purpose, file, fileName, slot, previousKey } = opts;
    let gen = 0;
    if (slot === "photo" || slot === "artPhoto" || slot === "faceVideo") {
      gen = ++uploadGen.current[slot];
      setMediaStatus((s) => ({ ...s, [slot]: "uploading" }));
      setUploadProgress((p) => ({ ...p, [slot]: 0 }));
      setKeys((k) => ({ ...k, [slot]: null }));
    } else {
      const reelIdx = slot.reel;
      const nextGen = (uploadGen.current.reels[reelIdx] ?? 0) + 1;
      uploadGen.current.reels[reelIdx] = nextGen;
      gen = nextGen;
      setMediaStatus((s) => {
        const reels = [...s.reels];
        reels[reelIdx] = "uploading";
        return { ...s, reels };
      });
      setUploadProgress((p) => {
        const reels = [...p.reels];
        reels[reelIdx] = 0;
        return { ...p, reels };
      });
      setKeys((k) => {
        const reels = [...k.reels];
        reels[reelIdx] = null;
        return { ...k, reels };
      });
    }

    void discardUploadedKey(previousKey);

    const reportProgress = (ratio: number) => {
      const stillCurrent =
        slot === "photo" || slot === "artPhoto" || slot === "faceVideo"
          ? uploadGen.current[slot] === gen
          : uploadGen.current.reels[slot.reel] === gen;
      if (!stillCurrent) return;
      if (slot === "photo" || slot === "artPhoto" || slot === "faceVideo") {
        setUploadProgress((p) => ({ ...p, [slot]: ratio }));
      } else {
        setUploadProgress((p) => {
          const reels = [...p.reels];
          reels[slot.reel] = ratio;
          return { ...p, reels };
        });
      }
    };

    const clearProgress = () => {
      if (slot === "photo" || slot === "artPhoto" || slot === "faceVideo") {
        setUploadProgress((p) => ({ ...p, [slot]: null }));
      } else {
        setUploadProgress((p) => {
          const reels = [...p.reels];
          reels[slot.reel] = null;
          return { ...p, reels };
        });
      }
    };

    const job = (async () => {
      try {
        const key = await uploadArtistMedia(file, purpose, {
          ...(fileName ? { fileName } : {}),
          onProgress: reportProgress,
        });
        const stillCurrent =
          slot === "photo" || slot === "artPhoto" || slot === "faceVideo"
            ? uploadGen.current[slot] === gen
            : uploadGen.current.reels[slot.reel] === gen;
        if (!stillCurrent) {
          await discardUploadedKey(key);
          return;
        }
        if (slot === "photo" || slot === "artPhoto" || slot === "faceVideo") {
          keysRef.current = { ...keysRef.current, [slot]: key };
          setKeys(keysRef.current);
          setMediaStatus((s) => ({ ...s, [slot]: "ready" }));
        } else {
          const nextReels = [...keysRef.current.reels];
          nextReels[slot.reel] = key;
          keysRef.current = { ...keysRef.current, reels: nextReels };
          setKeys(keysRef.current);
          setMediaStatus((s) => {
            const reels = [...s.reels];
            reels[slot.reel] = "ready";
            return { ...s, reels };
          });
        }
        clearProgress();
      } catch (e) {
        const stillCurrent =
          slot === "photo" || slot === "artPhoto" || slot === "faceVideo"
            ? uploadGen.current[slot] === gen
            : uploadGen.current.reels[slot.reel] === gen;
        if (!stillCurrent) return;
        if (slot === "photo" || slot === "artPhoto" || slot === "faceVideo") {
          setMediaStatus((s) => ({ ...s, [slot]: "error" }));
        } else {
          setMediaStatus((s) => {
            const reels = [...s.reels];
            reels[slot.reel] = "error";
            return { ...s, reels };
          });
        }
        clearProgress();
        showAlert({
          kind: "error",
          title: "Upload failed",
          message: e instanceof Error ? e.message : "Could not upload this file. Please try again.",
        });
      }
    })();
    trackUpload(job);
  }

  /** After DigiLocker draft restore — re-upload local files that have no S3 key yet. */
  function resumeUploadsFromFiles(next: PendingFiles) {
    if (next.photo) {
      queueDirectUpload({
        purpose: "photo",
        file: next.photo,
        fileName: next.photo.name,
        slot: "photo",
        previousKey: keysRef.current.photo,
      });
    }
    if (next.artPhoto) {
      queueDirectUpload({
        purpose: "artPhoto",
        file: next.artPhoto,
        fileName: next.artPhoto.name,
        slot: "artPhoto",
        previousKey: keysRef.current.artPhoto,
      });
    }
    if (next.faceVideo) {
      const face = normalizeFaceBlob(next.faceVideo);
      queueDirectUpload({
        purpose: "faceVideo",
        file: face,
        fileName: face.name,
        slot: "faceVideo",
        previousKey: keysRef.current.faceVideo,
      });
    }
    next.reels.forEach((reel, i) => {
      if (!reel) return;
      const normalized = normalizeReelFile(reel);
      queueDirectUpload({
        purpose: "reel",
        file: normalized,
        fileName: normalized.name,
        slot: { reel: i },
        previousKey: keysRef.current.reels[i] ?? null,
      });
    });
  }

  function showAlert(next: ArtistProfileAlert, opts?: { scroll?: boolean }) {
    setAlert(next);
    // Default: only jump for errors. Media attach must never yank the page upward.
    const shouldScroll = opts?.scroll ?? next.kind === "error";
    if (!shouldScroll) return;
    requestAnimationFrame(() =>
      alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  /** Keep scroll position when attaching media (file inputs / previews can jump the page). */
  function keepScroll(run: () => void) {
    const x = window.scrollX;
    const y = window.scrollY;
    run();
    requestAnimationFrame(() => {
      window.scrollTo(x, y);
      requestAnimationFrame(() => window.scrollTo(x, y));
    });
  }

  function clearField(field: ArtistProfileField) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function set<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    const mapped = FIELD_CLEAR_MAP[key];
    if (mapped) clearField(mapped);
  }

  function applyLocalFilePreviews(nextFiles: PendingFiles, nextForm: typeof empty) {
    const previewUpdates: Record<string, string> = {};
    const formUpdates = { ...nextForm };
    if (nextFiles.photo) {
      const key = localPreviewKey("photo");
      previewUpdates[key] = URL.createObjectURL(nextFiles.photo);
      formUpdates.photo_path = key;
    }
    if (nextFiles.artPhoto) {
      const key = localPreviewKey("art");
      previewUpdates[key] = URL.createObjectURL(nextFiles.artPhoto);
      formUpdates.art_photo_path = key;
    }
    if (nextFiles.faceVideo) {
      const key = localPreviewKey("face");
      previewUpdates[key] = URL.createObjectURL(nextFiles.faceVideo);
      formUpdates.face_video_path = key;
    }
    const reels = [...formUpdates.reels];
    nextFiles.reels.forEach((reel, i) => {
      if (!reel) return;
      const key = localPreviewKey("reel", i);
      previewUpdates[key] = URL.createObjectURL(reel);
      while (reels.length <= i) reels.push("");
      reels[i] = key;
    });
    formUpdates.reels = reels;
    if (Object.keys(previewUpdates).length) {
      setPreview((prev) => ({ ...prev, ...previewUpdates }));
    }
    return formUpdates;
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [forms] = await Promise.all([loadArtForms(), loadLocations()]);
      setArtForms(forms);
      const userRes = await api.auth.getUser();
      const uid = userRes.data.user?.id || (api.auth.getStoredUser()?.id ?? null);
      setCurrentUserId(uid);
      const draft = await loadArtistProfileDraft(uid ?? undefined);
      const res = await api.artists.getProfile();
      if (res.error) {
        // Row exists after signup even before POST; 404 is rare. Seed early location if empty.
        if (res.error.status === 404) {
          if (draft?.form) {
            const restoredForm = { ...empty, ...(draft.form as typeof empty) };
            const withPreviews = applyLocalFilePreviews(draft.files, restoredForm);
            setForm(withPreviews);
            setFiles(draft.files);
            setCustomSub(draft.customSub);
            setSavedCity(draft.savedCity);
            resumeUploadsFromFiles(draft.files);
          } else {
            setForm(empty);
          }
          setLoading(false);
          return;
        }
        showAlert({
          kind: "error",
          title: "Could not load your profile",
          message: res.error.message || "Please refresh and try again.",
        });
        setLoading(false);
        return;
      }
      const a = artistFrom(res.data);
      if (!a) {
        setLoading(false);
        return;
      }
      const opts = forms[a.discipline] ?? [];
      const reels = Array.isArray(a.reels)
        ? a.reels.filter((r: unknown): r is string => typeof r === "string" && !!r)
        : [];
      const alreadySubmitted = isSubmittedProfile(a);
      setVerification(a.verification_status || "unverified");
      setKycStatus(a.kyc_status || "not_started");
      setKycName(a.kyc_verified_name || "");
      setKycMasked(a.kyc_masked_aadhaar || "");
      setSubmitted(alreadySubmitted);

      if (alreadySubmitted) {
        void clearArtistProfileDraft();
        setIsEditing(false);
        setCustomSub(!!a.subcategory && !opts.includes(a.subcategory));

        // Restore media previews from S3 URLs so existing photos/videos render immediately
        const initialPreviews: Record<string, string> = {};
        if (a.photo_path && a.photo_url) initialPreviews[a.photo_path] = a.photo_url;
        if (a.art_photo_path && a.art_photo_url) initialPreviews[a.art_photo_path] = a.art_photo_url;
        if (a.face_video_path && a.face_video_url) initialPreviews[a.face_video_path] = a.face_video_url;
        if (Array.isArray(reels) && Array.isArray(a.reel_urls)) {
          reels.forEach((r, idx) => {
            if (r && a.reel_urls[idx]) initialPreviews[r] = a.reel_urls[idx];
          });
        }
        setPreview(initialPreviews);

        setForm({
          ...empty,
          stage_name: a.stage_name || "",
          legal_name: a.legal_name || a.kyc_verified_name || "",
          current_state: a.current_state || stateForCity(a.current_city),
          preferred_states: Array.isArray(a.preferred_states) ? a.preferred_states : [],
          discipline: a.discipline || empty.discipline,
          subcategory: a.subcategory || "",
          bio: a.bio || "",
          base_city: a.base_city || "",
          state_name: a.state_name || "",
          current_city: a.current_city || "",
          rate_inr: a.rate_inr ? Number(a.rate_inr) : 0,
          instagram: a.instagram || "",
          photo_path: a.photo_path || "",
          art_photo_path: a.art_photo_path || "",
          face_video_path: a.face_video_path || "",
          reels,
          primary_reel: a.primary_reel || 0,
          pricing_unit: (a.pricing_unit as typeof empty.pricing_unit) || "hour",
          travel_setting: (a.travel_setting as typeof empty.travel_setting) || "including",
          travel_charge_inr: a.travel_charge_inr || 0,
          stay_charge_inr: a.stay_charge_inr || 0,
          preferred_cities: Array.isArray(a.preferred_cities) ? a.preferred_cities : [],
          city_rates: (a.city_rates ?? {}) as Record<string, CityRate>,
          bank_account_holder: a.bank_account_holder || "",
          bank_name: a.bank_name || "",
          bank_account_number: maskAccount(a.bank_account_number || ""),
          bank_ifsc: maskIfsc(a.bank_ifsc || ""),
        });
        setSavedCity(a.current_city || "");
        setLoading(false);
        return;
      }

      // In-progress profile: restore DigiLocker draft so filled details do not vanish.
      if (draft?.form) {
        const restoredForm = { ...empty, ...(draft.form as typeof empty) };
        // Prefer KYC-verified legal name when DigiLocker completed while away.
        if (a.kyc_verified_name && !restoredForm.legal_name.trim()) {
          restoredForm.legal_name = a.kyc_verified_name;
        }
        const withPreviews = applyLocalFilePreviews(draft.files, restoredForm);
        const discOpts = forms[withPreviews.discipline] ?? [];
        setCustomSub(
          draft.customSub ||
            (!!withPreviews.subcategory && !discOpts.includes(withPreviews.subcategory)),
        );
        setForm(withPreviews);
        setFiles(draft.files);
        setSavedCity(draft.savedCity || withPreviews.current_city || "");
        resumeUploadsFromFiles(draft.files);
        setLoading(false);
        return;
      }

      setCustomSub(!!a.subcategory && !opts.includes(a.subcategory));
      setForm({
        ...empty,
        stage_name: a.stage_name || "",
        legal_name: a.legal_name || a.kyc_verified_name || "",
        current_state: a.current_state || (a.current_city ? stateForCity(a.current_city) : ""),
        preferred_states: Array.isArray(a.preferred_states) ? a.preferred_states : [],
        discipline: a.discipline || empty.discipline,
        subcategory: a.subcategory || "",
        bio: a.bio || "",
        base_city: a.base_city || "",
        state_name: a.state_name || "",
        current_city: a.current_city || "",
        rate_inr: a.rate_inr ? Number(a.rate_inr) : 0,
        instagram: a.instagram || "",
        photo_path: a.photo_path || "",
        art_photo_path: a.art_photo_path || "",
        face_video_path: a.face_video_path || "",
        reels,
        primary_reel: a.primary_reel || 0,
        pricing_unit: (a.pricing_unit as typeof empty.pricing_unit) || "hour",
        travel_setting: (a.travel_setting as typeof empty.travel_setting) || "including",
        travel_charge_inr: a.travel_charge_inr || 0,
        stay_charge_inr: a.stay_charge_inr || 0,
        preferred_cities: Array.isArray(a.preferred_cities) ? a.preferred_cities : [],
        city_rates: (a.city_rates ?? {}) as Record<string, CityRate>,
        bank_account_holder: a.bank_account_holder || "",
        bank_name: a.bank_name || "",
        bank_account_number: a.bank_account_number ? maskAccount(a.bank_account_number) : "",
        bank_ifsc: a.bank_ifsc || "",
      });
      setSavedCity(a.current_city || "");
      setLoading(false);
    })();
  }, []);

  // Keep a local draft so DigiLocker redirects don't wipe the form.
  useEffect(() => {
    if (loading || submitted) return;
    const persist = () => {
      void saveArtistProfileDraft({
        userId: currentUserId ?? undefined,
        form,
        files,
        customSub,
        savedCity,
      });
    };
    const timer = window.setTimeout(persist, 400);
    window.addEventListener("pagehide", persist);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", persist);
    };
  }, [form, files, customSub, savedCity, loading, submitted, currentUserId]);

  // Block page interaction while the heavy multipart POST is in flight.
  useEffect(() => {
    if (!busy) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    // Capture-phase so nav / other UI cannot receive clicks or scrolls.
    document.addEventListener("click", block, true);
    document.addEventListener("pointerdown", block, true);
    document.addEventListener("touchstart", block, true);
    document.addEventListener("keydown", block, true);
    document.addEventListener("wheel", block, { capture: true, passive: false });
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("click", block, true);
      document.removeEventListener("pointerdown", block, true);
      document.removeEventListener("touchstart", block, true);
      document.removeEventListener("keydown", block, true);
      document.removeEventListener("wheel", block, true);
    };
  }, [busy]);

  useEffect(() => {
    // Only resolve stored media paths — never local: blob placeholders (those already have object URLs).
    const paths = [
      form.photo_path,
      form.art_photo_path,
      form.face_video_path,
      ...form.reels,
    ].filter((path): path is string => !!path && !path.startsWith("local:") && !path.startsWith("blob:"));
    if (!paths.length) return;
    let active = true;
    Promise.all(
      paths.map(async (path) => {
        const { data } = await api.storage.from("kalzo-media").createSignedUrl(path, 600);
        return [path, data?.signedUrl ?? ""] as const;
      }),
    ).then((entries) => {
      if (!active) return;
      setPreview((prev) => {
        const next = { ...prev };
        for (const [path, url] of entries) {
          if (!url) continue;
          // Never replace an in-memory blob preview with a remote URL.
          if (prev[path]?.startsWith("blob:")) continue;
          next[path] = url;
        }
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [form.photo_path, form.art_photo_path, form.face_video_path, form.reels]);

  function cityChanged(c: string) {
    set("current_city", c);
    set("current_state", stateForCity(c));
    if (!c || c === savedCity) return;
    const prev = form.city_rates[c];
    setCityAsk({
      city: c,
      rate: prev?.rate ?? (form.rate_inr || 2000),
      travel: prev?.travel ?? (form.travel_setting === "excluding" ? "separate" : form.travel_setting === "including" ? "included" : "separate"),
      travel_charge: prev?.travel_charge ?? (form.travel_charge_inr || 0),
      stay_charge: prev?.stay_charge ?? (form.stay_charge_inr || 0),
    });
  }

  function setLocalPreview(key: string, file: Blob) {
    const url = URL.createObjectURL(file);
    setPreview((p) => {
      const prev = p[key];
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return { ...p, [key]: url };
    });
    return url;
  }

  function isImageFile(file: File) {
    if (["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type)) return true;
    // Some browsers leave type empty; fall back to extension.
    return /\.(jpe?g|png|webp)$/i.test(file.name);
  }

  function isVideoFile(file: File) {
    if (["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) return true;
    return /\.(mp4|webm|mov)$/i.test(file.name);
  }

  function pickFile(file: File | undefined, index: number) {
    if (!file) return;
    keepScroll(() => {
      const photo = index === -1 || index === -3;
      if ((photo ? !isImageFile(file) : !isVideoFile(file)) || file.size > MAX_MEDIA_BYTES) {
        showAlert({
          kind: "error",
          title: photo ? "Photograph not accepted" : "Reel not accepted",
          message: photo
            ? "Please choose a JPG, PNG or WebP image under 100 MB."
            : "Please choose an MP4, WebM or MOV video under 100 MB.",
        });
        return;
      }
      if (index === -1) {
        const prevKey = keysRef.current.photo;
        const key = localPreviewKey("photo");
        setFiles((f) => ({ ...f, photo: file }));
        setLocalPreview(key, file);
        setForm((f) => ({ ...f, photo_path: key }));
        clearField("photo");
        queueDirectUpload({
          purpose: "photo",
          file,
          fileName: file.name,
          slot: "photo",
          previousKey: prevKey,
        });
      } else if (index === -3) {
        const prevKey = keysRef.current.artPhoto;
        const key = localPreviewKey("art");
        setFiles((f) => ({ ...f, artPhoto: file }));
        setLocalPreview(key, file);
        setForm((f) => ({ ...f, art_photo_path: key }));
        clearField("art_photo");
        queueDirectUpload({
          purpose: "artPhoto",
          file,
          fileName: file.name,
          slot: "artPhoto",
          previousKey: prevKey,
        });
      } else {
        const prevKey = keysRef.current.reels[index] ?? null;
        const key = localPreviewKey("reel", index);
        setFiles((f) => {
          const reels = [...f.reels];
          reels[index] = file;
          return { ...f, reels };
        });
        setLocalPreview(key, file);
        setForm((f) => {
          const reels = [...f.reels];
          while (reels.length <= index) reels.push("");
          reels[index] = key;
          return { ...f, reels };
        });
        clearField("reels");
        clearField("primary_reel");
        const normalized = normalizeReelFile(file);
        queueDirectUpload({
          purpose: "reel",
          file: normalized,
          fileName: normalized.name,
          slot: { reel: index },
          previousKey: prevKey,
        });
      }
    });
  }

  async function pickFace(blob: Blob) {
    keepScroll(() => {
      const prevKey = keysRef.current.faceVideo;
      const key = localPreviewKey("face");
      setFiles((f) => ({ ...f, faceVideo: blob }));
      setLocalPreview(key, blob);
      setForm((f) => ({ ...f, face_video_path: key }));
      clearField("face_video");
      const face = normalizeFaceBlob(blob);
      queueDirectUpload({
        purpose: "faceVideo",
        file: face,
        fileName: face.name,
        slot: "faceVideo",
        previousKey: prevKey,
      });
    });
  }

  function removeReel(index: number) {
    const remainingCount = [0, 1, 2, 3].filter(
      (i) => i !== index && Boolean(form.reels[i] || files.reels[i] || keysRef.current.reels[i]),
    ).length;
    if (submitted && remainingCount < 2) {
      showAlert({
        kind: "error",
        title: "Minimum reels required",
        message: "You must keep at least 2 showreels on your profile. You can use 'Replace' to change this video instead.",
      });
      return;
    }

    keepScroll(() => {
      setFiles((f) => {
        const next = [...f.reels];
        next[index] = null;
        return { ...f, reels: next };
      });
      keysRef.current.reels[index] = null;
      setKeys((k) => {
        const next = [...k.reels];
        next[index] = null;
        return { ...k, reels: next };
      });
      setMediaStatus((s) => {
        const next = [...s.reels];
        next[index] = "idle";
        return { ...s, reels: next };
      });
      setForm((f) => {
        const next = [...f.reels];
        next[index] = "";
        let nextPrimary = f.primary_reel;
        if (nextPrimary === index) {
          const firstAvail = next.findIndex((r) => Boolean(r));
          nextPrimary = firstAvail >= 0 ? firstAvail : 0;
        }
        return { ...f, reels: next, primary_reel: nextPrimary };
      });
    });
  }

  function removePhoto() {
    keepScroll(() => {
      setFiles((f) => ({ ...f, photo: null }));
      keysRef.current.photo = null;
      setKeys((k) => ({ ...k, photo: null }));
      setMediaStatus((s) => ({ ...s, photo: "idle" }));
      setForm((f) => ({ ...f, photo_path: "" }));
    });
  }

  function removeArtPhoto() {
    keepScroll(() => {
      setFiles((f) => ({ ...f, artPhoto: null }));
      keysRef.current.artPhoto = null;
      setKeys((k) => ({ ...k, artPhoto: null }));
      setMediaStatus((s) => ({ ...s, artPhoto: "idle" }));
      setForm((f) => ({ ...f, art_photo_path: "" }));
    });
  }

  function removeFaceVideo() {
    keepScroll(() => {
      setFiles((f) => ({ ...f, faceVideo: null }));
      keysRef.current.faceVideo = null;
      setKeys((k) => ({ ...k, faceVideo: null }));
      setMediaStatus((s) => ({ ...s, faceVideo: "idle" }));
      setForm((f) => ({ ...f, face_video_path: "" }));
    });
  }

  function previewSrc(path: string | undefined) {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) return path;
    return preview[path] ?? "";
  }

  function runValidation(isUpdate = false) {
    const keys = keysRef.current;
    const hasPhoto = isUpdate ? true : Boolean(files.photo || keys.photo || form.photo_path);
    const hasArtPhoto = isUpdate ? true : Boolean(files.artPhoto || keys.artPhoto || form.art_photo_path);
    const hasFaceVideo = isUpdate ? true : Boolean(files.faceVideo || keys.faceVideo || form.face_video_path);

    const reelCount = [0, 1, 2, 3].filter((i) => {
      if (files.reels[i] || keys.reels[i]) return true;
      if (form.reels[i]) return true;
      return false;
    }).length;

    const hasPrimaryReel = isUpdate
      ? reelCount > 0
      : Boolean(files.reels[form.primary_reel] || keys.reels[form.primary_reel] || form.reels[form.primary_reel]);

    const isMaskedAccount =
      form.bank_account_number.includes("*") || form.bank_account_number.includes("•");
    const isMaskedIfsc = form.bank_ifsc.includes("*") || form.bank_ifsc.includes("•");

    const validatedForm = {
      ...form,
      bank_account_number: isUpdate && isMaskedAccount ? "123456789012" : form.bank_account_number,
      bank_ifsc: isUpdate && isMaskedIfsc ? "HDFC0001234" : form.bank_ifsc,
      bank_account_holder:
        isUpdate && !form.bank_account_holder.trim() ? "Verified Holder" : form.bank_account_holder,
      bank_name: isUpdate && !form.bank_name.trim() ? "Bank Name" : form.bank_name,
    };

    return validateArtistProfileSubmit({
      ...validatedForm,
      has_photo: hasPhoto,
      has_art_photo: hasArtPhoto,
      has_face_video: hasFaceVideo,
      reel_count: reelCount,
      has_primary_reel: hasPrimaryReel,
    });
  }

  async function startDigilocker() {
    if (kycDone || submitted || kycBusy) return;
    setKycBusy(true);
    setAlert(null);
    try {
      // Persist before Surepass navigates away so filled details survive the round-trip.
      await saveArtistProfileDraft({
        userId: currentUserId ?? undefined,
        form,
        files,
        customSub,
        savedCity,
      });
      const res = await api.kyc.initiateDigilocker();
      if (res.error) {
        showAlert({
          kind: "error",
          title: "Digilocker could not start",
          message: res.error.message || "Please try again in a moment.",
        });
        return;
      }
      const session = digilockerSessionFrom(res.data);
      if (!session) {
        showAlert({
          kind: "error",
          title: "Digilocker could not start",
          message: "Surepass did not return a Digilocker session.",
        });
        return;
      }
      setKycStatus("pending");
      await openDigilockerSession(session);
    } catch (e) {
      showAlert({
        kind: "error",
        title: "Digilocker could not start",
        message: e instanceof Error ? e.message : "Something went wrong. Please try again.",
      });
    } finally {
      setKycBusy(false);
    }
  }

  async function submit() {
    if (!kycDone && !submitted) {
      showAlert({
        kind: "error",
        title: "Digilocker KYC required",
        message: "Complete the Digilocker Aadhaar check before submitting your profile.",
      });
      document.querySelector('[data-field="digilocker"]')?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    const isUpdate = submitted;
    const result = runValidation(isUpdate);
    if (!result.ok) {
      setFieldErrors(result.fields);
      showAlert(result.alert);
      if (result.firstField) {
        const el = document.querySelector(`[data-field="${result.firstField}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    setBusy(true);
    setAlert(null);
    setFieldErrors({});
    try {
      await waitForInflightUploads();

      const keys = keysRef.current;

      if (isUpdate) {
        // --- PATCH UPDATE FLOW FOR EXISTING PROFILE ---
        const finalPhoto =
          keys.photo ||
          (form.photo_path && !form.photo_path.startsWith("local:") ? form.photo_path : undefined);
        const finalArtPhoto =
          keys.artPhoto ||
          (form.art_photo_path && !form.art_photo_path.startsWith("local:") ? form.art_photo_path : null);
        const finalFaceVideo =
          keys.faceVideo ||
          (form.face_video_path && !form.face_video_path.startsWith("local:") ? form.face_video_path : null);

        const finalReels: string[] = [];
        for (let i = 0; i < 4; i++) {
          const k =
            keys.reels[i] ||
            (form.reels[i] && !form.reels[i].startsWith("local:") && !form.reels[i].startsWith("blob:")
              ? form.reels[i]
              : null);
          if (k) finalReels.push(k);
        }

        const primaryIdx = Math.max(0, Math.min(form.primary_reel, Math.max(0, finalReels.length - 1)));
        const updatePayload: Record<string, unknown> = {
          stageName: form.stage_name.trim(),
          legalName: form.legal_name.trim(),
          baseCity: form.base_city.trim(),
          stateName: form.state_name.trim(),
          currentCity: form.current_city.trim(),
          currentState: form.current_state.trim(),
          preferredCities: form.preferred_cities,
          preferredStates: form.preferred_states,
          discipline: form.discipline.trim(),
          subcategory: form.subcategory.trim(),
          bio: form.bio.trim(),
          instagram: form.instagram.trim(),
          rateInr: form.rate_inr,
          pricingUnit: form.pricing_unit,
          travelSetting: form.travel_setting,
          travelChargeInr: form.travel_setting === "excluding" ? form.travel_charge_inr : 0,
          stayChargeInr: form.travel_setting === "excluding" ? form.stay_charge_inr : 0,
          cityRates: form.city_rates,
          primaryReel: primaryIdx,
        };

        if (finalPhoto) {
          updatePayload.photoPath = finalPhoto;
        } else if (!form.photo_path) {
          updatePayload.photoPath = null;
        }

        if (keys.artPhoto) {
          updatePayload.artPhotoPath = keys.artPhoto;
        } else if (form.art_photo_path && !form.art_photo_path.startsWith("local:")) {
          updatePayload.artPhotoPath = form.art_photo_path;
        } else {
          updatePayload.artPhotoPath = null;
        }

        if (keys.faceVideo) {
          updatePayload.faceVideoPath = keys.faceVideo;
        } else if (form.face_video_path && !form.face_video_path.startsWith("local:")) {
          updatePayload.faceVideoPath = form.face_video_path;
        } else {
          updatePayload.faceVideoPath = null;
        }

        if (finalReels.length >= 2) updatePayload.reels = finalReels;

        if (form.bank_account_holder.trim()) {
          updatePayload.bankAccountHolder = form.bank_account_holder.trim();
        }
        if (form.bank_name.trim()) {
          updatePayload.bankName = form.bank_name.trim();
        }
        if (
          form.bank_account_number.trim() &&
          !form.bank_account_number.includes("*") &&
          !form.bank_account_number.includes("•")
        ) {
          updatePayload.bankAccountNumber = form.bank_account_number.trim();
        }
        if (
          form.bank_ifsc.trim() &&
          !form.bank_ifsc.includes("*") &&
          !form.bank_ifsc.includes("•")
        ) {
          updatePayload.bankIfsc = form.bank_ifsc.trim().toUpperCase();
        }

        const res = await api.artists.updateProfile(updatePayload);
        if (res.error) {
          showAlert({
            kind: "error",
            title: "Profile update failed",
            message: res.error.message || "Please check your details and try again.",
          });
          return;
        }

        const updated = artistFrom(res.data);
        if (updated) {
          setSavedCity(updated.current_city || form.current_city);
          if (updated.photo_url && updated.photo_path) {
            setPreview((p) => ({ ...p, [updated.photo_path!]: updated.photo_url! }));
          }
          if (updated.art_photo_url && updated.art_photo_path) {
            setPreview((p) => ({ ...p, [updated.art_photo_path!]: updated.art_photo_url! }));
          }
          if (updated.face_video_url && updated.face_video_path) {
            setPreview((p) => ({ ...p, [updated.face_video_path!]: updated.face_video_url! }));
          }
          if (Array.isArray(updated.reels) && Array.isArray(updated.reel_urls)) {
            const nextP: Record<string, string> = {};
            updated.reels.forEach((r, idx) => {
              if (r && updated.reel_urls[idx]) nextP[r] = updated.reel_urls[idx];
            });
            setPreview((p) => ({ ...p, ...nextP }));
          }
          setForm((f) => ({
            ...f,
            stage_name: updated.stage_name ?? f.stage_name,
            legal_name: updated.legal_name ?? f.legal_name,
            discipline: updated.discipline ?? f.discipline,
            subcategory: updated.subcategory ?? f.subcategory,
            bio: updated.bio ?? f.bio,
            instagram: updated.instagram ?? f.instagram,
            rate_inr: updated.rate_inr ?? f.rate_inr,
            pricing_unit: (updated.pricing_unit as typeof f.pricing_unit) ?? f.pricing_unit,
            travel_setting: (updated.travel_setting as typeof f.travel_setting) ?? f.travel_setting,
            travel_charge_inr: updated.travel_charge_inr ?? f.travel_charge_inr,
            stay_charge_inr: updated.stay_charge_inr ?? f.stay_charge_inr,
            city_rates: (updated.city_rates as Record<string, CityRate>) ?? f.city_rates,
            base_city: updated.base_city ?? f.base_city,
            state_name: updated.state_name ?? f.state_name,
            current_city: updated.current_city ?? f.current_city,
            current_state: updated.current_state ?? f.current_state,
            preferred_cities: updated.preferred_cities ?? f.preferred_cities,
            preferred_states: updated.preferred_states ?? f.preferred_states,
            bank_account_holder: updated.bank_account_holder ?? f.bank_account_holder,
            bank_name: updated.bank_name ?? f.bank_name,
            bank_account_number: updated.bank_account_number ? maskAccount(updated.bank_account_number) : f.bank_account_number,
            bank_ifsc: updated.bank_ifsc ? maskIfsc(updated.bank_ifsc) : f.bank_ifsc,
            photo_path: updated.photo_path ?? "",
            art_photo_path: updated.art_photo_path ?? "",
            face_video_path: updated.face_video_path ?? "",
            reels: Array.isArray(updated.reels) && updated.reels.length ? updated.reels : f.reels,
            primary_reel: updated.primary_reel ?? f.primary_reel,
          }));
        }

        setFiles(emptyFiles());
        setKeys(emptyKeys());
        setMediaStatus(emptyMediaStatus());
        setIsEditing(false);
        const rawRes = res.data as { message?: string } | undefined;
        showAlert({
          kind: "success",
          title: "Profile updated successfully",
          message: rawRes?.message || "Your profile changes and media updates have been saved.",
        });
        return;
      }
      const reelSlots = files.reels
        .map((reel, i) => ({ reel, i, key: keys.reels[i] }))
        .filter((x): x is { reel: File; i: number; key: string | null } => !!x.reel);
      const reelKeys = reelSlots.map((x) => x.key).filter((k): k is string => !!k);

      if (!keys.photo || !keys.artPhoto || !keys.faceVideo || reelKeys.length < 2) {
        showAlert({
          kind: "error",
          title: "Media still uploading",
          message:
            "Wait for photographs and videos to finish uploading (or re-attach any that failed), then submit again.",
        });
        return;
      }

      const primaryAmong = reelSlots.findIndex((x) => x.i === form.primary_reel);

      const res = await api.artists.saveProfile({
        stageName: form.stage_name.trim(),
        legalName: form.legal_name.trim(),
        baseCity: form.base_city.trim(),
        stateName: form.state_name.trim(),
        currentCity: form.current_city.trim(),
        currentState: form.current_state.trim(),
        preferredCities: form.preferred_cities,
        preferredStates: form.preferred_states,
        discipline: form.discipline.trim(),
        subcategory: form.subcategory.trim(),
        bio: form.bio.trim(),
        instagram: form.instagram.trim(),
        rateInr: form.rate_inr,
        pricingUnit: form.pricing_unit,
        travelSetting: form.travel_setting,
        travelChargeInr: form.travel_setting === "excluding" ? form.travel_charge_inr : 0,
        stayChargeInr: form.travel_setting === "excluding" ? form.stay_charge_inr : 0,
        cityRates: form.city_rates,
        bankAccountHolder: form.bank_account_holder.trim(),
        bankName: form.bank_name.trim(),
        bankAccountNumber: form.bank_account_number.trim(),
        bankIfsc: form.bank_ifsc.trim().toUpperCase(),
        primaryReel: primaryAmong >= 0 ? primaryAmong : 0,
        photoPath: keys.photo,
        artPhotoPath: keys.artPhoto,
        faceVideoPath: keys.faceVideo,
        reels: reelKeys,
      });
      if (res.error) {
        showAlert({
          kind: "error",
          title: "Profile could not be submitted",
          message: res.error.message || "Please check your details and try again.",
        });
        return;
      }

      const saved = artistFrom(res.data);
      await clearArtistProfileDraft();
      setSavedCity(form.current_city);
      setVerification(saved?.verification_status ?? "unverified");
      setKycStatus(saved?.kyc_status ?? kycStatus);
      setKycName(saved?.kyc_verified_name || kycName);
      setKycMasked(saved?.kyc_masked_aadhaar || kycMasked);
      setFiles(emptyFiles());
      setKeys(emptyKeys());
      setMediaStatus(emptyMediaStatus());
      setSubmitted(true);
      setIsEditing(false);
      if (saved?.photo_path) {
        setForm((f) => ({
          ...f,
          photo_path: saved.photo_path || f.photo_path,
          art_photo_path: saved.art_photo_path || f.art_photo_path,
          face_video_path: saved.face_video_path || f.face_video_path,
          reels: Array.isArray(saved.reels) && saved.reels.length ? saved.reels : f.reels,
          primary_reel: saved.primary_reel ?? f.primary_reel,
          bank_account_holder: saved.bank_account_holder || f.bank_account_holder,
          bank_name: saved.bank_name || f.bank_name,
          bank_account_number: maskAccount(saved.bank_account_number || f.bank_account_number),
          bank_ifsc: maskIfsc(saved.bank_ifsc || f.bank_ifsc),
        }));
      }
      const rawSubmit = res.data as { message?: string } | undefined;
      showAlert({
        kind: "success",
        title: "Profile submitted for verification",
        message:
          rawSubmit?.message ||
          "Kalzo will compare your face video with your photo and Instagram. We’ll update your status once reviewed.",
      });
    } catch (e) {
      showAlert({
        kind: "error",
        title: "Profile could not be submitted",
        message: e instanceof Error ? e.message : "Something went wrong. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }
  const subs = artForms[form.discipline] ?? [];
  const err = (field: ArtistProfileField) => fieldErrors[field];
  const locked = busy;
  if (loading) {
    return <p className="kl-note">Loading your submitted profile…</p>;
  }

  if (submitted && !isEditing) {
    return (
      <>
        <div ref={alertRef}>{alert && <ProfileAlertBanner alert={alert} onDismiss={() => setAlert(null)} />}</div>
        <ProfileDetailsOverview
          form={form}
          previewSrc={previewSrc}
          verification={verification}
          kycStatus={kycStatus}
          kycMasked={kycMasked}
          onEdit={() => {
            setIsEditing(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </>
    );
  }

  return (
    <>
      {busy &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="ka-submit-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-busy="true"
            aria-live="assertive"
            aria-label="Submitting your artist profile"
          >
            <div className="ka-submit-loader">
              <span className="ka-submit-spinner" aria-hidden="true" />
              <strong>Submitting your profile</strong>
              <p>Saving your details. Media uploads in the background first if any are still finishing.</p>
            </div>
          </div>,
          document.body,
        )}
      <div ref={alertRef}>{alert && <ProfileAlertBanner alert={alert} onDismiss={() => setAlert(null)} />}</div>

      {submitted && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 24px", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "Playfair Display, serif", fontSize: 24 }}>Update Your Artist Profile</h2>
            <p style={{ margin: "4px 0 0", color: "var(--artist-rust, #888)", fontSize: 14 }}>Edit your details, pricing, coverage areas, or showreels.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setIsEditing(false);
              setAlert(null);
              setFieldErrors({});
            }}
          >
            Cancel and view profile
          </Button>
        </div>
      )}
     
      <ProfileCard
        photoUrl={previewSrc(form.photo_path) || undefined}
        artUrl={previewSrc(form.art_photo_path) || undefined}
        stageName={form.stage_name}
        art={form.subcategory || form.discipline || "Musicians"}
        baseCity={form.base_city}
        rateInr={form.rate_inr || undefined}
        pricingUnit={form.pricing_unit || "hour"}
        status={verification}
      />

      <fieldset className="ka-card" disabled={locked}>
        <legend>Who you are</legend>
        <div className="kl-form">
          <label data-field="stage_name" className={err("stage_name") ? "ka-field-invalid" : undefined}>
            Stage name *
            <input
              required
              value={form.stage_name}
              maxLength={100}
              aria-invalid={!!err("stage_name")}
              className={err("stage_name") ? "ka-input-invalid" : undefined}
              onChange={(e) => set("stage_name", e.target.value)}
            />
            <FieldError message={err("stage_name")} />
          </label>
          <label data-field="legal_name" className={err("legal_name") ? "ka-field-invalid" : undefined}>
            Name as per Aadhaar *
            <input
              required
              value={form.legal_name}
              maxLength={100}
              aria-invalid={!!err("legal_name")}
              className={err("legal_name") ? "ka-input-invalid" : undefined}
              onChange={(e) => set("legal_name", e.target.value)}
            />
            <FieldError message={err("legal_name")} />
          </label>
          <LocationSelect
            required
            label="Base city"
            fieldKey="base_city"
            value={form.base_city}
            invalid={!!err("base_city")}
            error={err("base_city")}
            onChange={(city) => {
              set("base_city", city);
              set("state_name", stateForCity(city));
            }}
          />
          <LocationSelect
            required
            label="Base state"
            fieldKey="state_name"
            state
            value={form.state_name}
            invalid={!!err("state_name")}
            error={err("state_name")}
            onChange={(state) => set("state_name", state)}
          />
          <LocationSelect
            required
            label="Current city"
            fieldKey="current_city"
            value={form.current_city}
            invalid={!!err("current_city")}
            error={err("current_city")}
            onChange={cityChanged}
          />
          <LocationSelect
            required
            state
            label="Current state"
            fieldKey="current_state"
            value={form.current_state}
            invalid={!!err("current_state")}
            error={err("current_state")}
            onChange={(state) => set("current_state", state)}
          />
          <label data-field="instagram" className={"kl-full" + (err("instagram") ? " ka-field-invalid" : "")}>
            Instagram profile URL *
            <input
              required
              placeholder="https://instagram.com/yourname"
              value={form.instagram}
              maxLength={200}
              aria-invalid={!!err("instagram")}
              className={err("instagram") ? "ka-input-invalid" : undefined}
              onChange={(e) => set("instagram", e.target.value)}
            />
            <FieldError message={err("instagram")} />
          </label>
          <label data-field="discipline" className={err("discipline") ? "ka-field-invalid" : undefined}>
            Art form *
            <VintageFilterSelect
              variant="field"
              aria-label="Art form"
              value={form.discipline}
              className={err("discipline") ? "ka-input-invalid" : undefined}
              options={Object.keys(artForms).map((c) => ({ value: c, label: c }))}
              onChange={(e) => {
                set("discipline", e.target.value);
                set("subcategory", "");
                setCustomSub(false);
              }}
            />
            <FieldError message={err("discipline")} />
          </label>
          <label data-field="subcategory" className={err("subcategory") ? "ka-field-invalid" : undefined}>
            What kind of {form.discipline.toLowerCase()}? *
            {subs.length > 0 && !customSub ? (
              <VintageFilterSelect
                variant="field"
                aria-label={`What kind of ${form.discipline.toLowerCase()}`}
                value={form.subcategory}
                className={err("subcategory") ? "ka-input-invalid" : undefined}
                options={[
                  { value: "", label: "Choose…" },
                  ...subs.map((s) => ({ value: s, label: s })),
                  { value: OTHER, label: OTHER },
                ]}
                onChange={(e) =>
                  e.target.value === OTHER
                    ? (setCustomSub(true), set("subcategory", ""))
                    : set("subcategory", e.target.value)
                }
              />
            ) : (
              <input
                placeholder="Describe the art you perform"
                value={form.subcategory}
                maxLength={100}
                aria-invalid={!!err("subcategory")}
                className={err("subcategory") ? "ka-input-invalid" : undefined}
                onChange={(e) => set("subcategory", e.target.value)}
              />
            )}
            <FieldError message={err("subcategory")} />
          </label>
        </div>
      </fieldset>

      <fieldset className="ka-card" disabled={locked}>
        <legend>The value of your performance</legend>
        <div className="kl-form">
          <label data-field="rate_inr" className={err("rate_inr") ? "ka-field-invalid" : undefined}>
            Hourly rate in rupees *
            <input
              required
              type="number"
              min={1}
              max={100000}
              placeholder="e.g. 5000"
              value={form.rate_inr === 0 ? "" : form.rate_inr}
              aria-invalid={!!err("rate_inr")}
              className={err("rate_inr") ? "ka-input-invalid" : undefined}
              onChange={(e) => {
                const raw = e.target.value.replace(/^0+(?=\d)/, "");
                set("rate_inr", raw === "" ? 0 : Math.max(0, Number(raw)));
              }}
            />
            <FieldError message={err("rate_inr")} />
          </label>
          <div data-field="travel_setting">
            Travel and stay *
            <div className="ka-toggle" role="radiogroup">
              {(
                [
                  ["including", "Included"],
                  ["excluding", "Charged separately"],
                ] as const
              ).map(([v, l]) => (
                <Button
                  variant="outline"
                  key={v}
                  role="radio"
                  aria-checked={form.travel_setting === v}
                  className={form.travel_setting === v ? "on" : ""}
                  onClick={() => set("travel_setting", v)}
                >
                  {l}
                </Button>
              ))}
            </div>
            <FieldError message={err("travel_setting")} />
          </div>
          {form.travel_setting === "excluding" && (
            <>
              <label data-field="travel_charge_inr" className={err("travel_charge_inr") ? "ka-field-invalid" : undefined}>
                <Plane size={16} />
                Travel charges (₹) *
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.travel_charge_inr === 0 ? "" : form.travel_charge_inr}
                  aria-invalid={!!err("travel_charge_inr")}
                  className={err("travel_charge_inr") ? "ka-input-invalid" : undefined}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^0+(?=\d)/, "");
                    set("travel_charge_inr", raw === "" ? 0 : Math.max(0, Number(raw)));
                  }}
                />
                <FieldError message={err("travel_charge_inr")} />
              </label>
              <label data-field="stay_charge_inr" className={err("stay_charge_inr") ? "ka-field-invalid" : undefined}>
                <BedDouble size={16} />
                Stay and living charges (₹) *
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.stay_charge_inr === 0 ? "" : form.stay_charge_inr}
                  aria-invalid={!!err("stay_charge_inr")}
                  className={err("stay_charge_inr") ? "ka-input-invalid" : undefined}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^0+(?=\d)/, "");
                    set("stay_charge_inr", raw === "" ? 0 : Math.max(0, Number(raw)));
                  }}
                />
                <FieldError message={err("stay_charge_inr")} />
              </label>
            </>
          )}
          {form.travel_setting === "including" && (
            <p className="kl-note kl-full">Your hourly rate already covers travel and stay.</p>
          )}
          <PreferredCities
            value={form.preferred_cities}
            invalid={!!err("preferred_cities")}
            error={err("preferred_cities")}
            onChange={(cities) => {
              set("preferred_cities", cities);
              set("preferred_states", [...new Set(cities.map(stateForCity).filter(Boolean))]);
            }}
          />
          {Object.entries(form.city_rates).length > 0 && (
            <div className="kl-full" style={{ marginTop: 4, marginBottom: 8 }}>
              <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--artist-rust, #8b5a2b)", fontWeight: 600, marginBottom: 6 }}>
                Specific city rates:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(form.city_rates).map(([city, rateObj]) => (
                  <div
                    key={city}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 10px",
                      borderRadius: 6,
                      background: "var(--artist-paper, #fff)",
                      border: "1.5px solid var(--desk-brass, #b48a4a)",
                      fontSize: 13,
                    }}
                  >
                    <span>
                      <strong>{city}:</strong> ₹{rateObj.rate.toLocaleString("en-IN")}/hr{" "}
                      <small style={{ color: "var(--artist-rust, #888)", fontSize: 11 }}>
                        ({rateObj.travel === "separate" ? "separate travel" : rateObj.travel === "included" ? "travel included" : "no travel"})
                      </small>
                    </span>
                    <button
                      type="button"
                      aria-label={`Edit rate for ${city}`}
                      title={`Edit rate for ${city}`}
                      onClick={() => {
                        setCityAsk({
                          city,
                          rate: rateObj.rate,
                          travel: rateObj.travel,
                          travel_charge: rateObj.travel_charge ?? 0,
                          stay_charge: rateObj.stay_charge ?? 0,
                        });
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--artist-ink, inherit)",
                        padding: "2px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove specific rate for ${city}`}
                      title={`Remove specific rate for ${city}`}
                      onClick={() => {
                        setForm((f) => {
                          const nextCityRates = { ...f.city_rates };
                          delete nextCityRates[city];
                          return { ...f, city_rates: nextCityRates };
                        });
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--artist-rust, #c0392b)",
                        padding: "2px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <label data-field="bio" className={"kl-full" + (err("bio") ? " ka-field-invalid" : "")}>
            About you and your act *
            <textarea
              required
              rows={4}
              maxLength={2000}
              value={form.bio}
              aria-invalid={!!err("bio")}
              className={err("bio") ? "ka-input-invalid" : undefined}
              onChange={(e) => set("bio", e.target.value)}
            />
            <FieldError message={err("bio")} />
          </label>
        </div>
      </fieldset>

      <fieldset className="ka-card" data-field="photo" disabled={locked}>
        <legend>Photographs</legend>
        <div className="ka-photos">
          <div style={{ position: "relative", width: 170, height: 170 }}>
            <label
              className={"ka-drop round" + (err("photo") ? " ka-input-invalid" : "")}
              title={previewSrc(form.photo_path) ? "Click to change profile photograph" : "Click to upload profile photograph"}
            >
              {previewSrc(form.photo_path) ? (
                <img src={previewSrc(form.photo_path)} alt="Profile photograph preview" />
              ) : (
                <span>Profile photograph *</span>
              )}
              {mediaStatus.photo === "uploading" && <UploadPctOverlay ratio={uploadProgress.photo} />}
              <input
                type="file"
                title=""
                aria-label="Upload profile photo"
                accept="image/jpeg,image/png,image/webp,image/jpg,.jpg,.jpeg,.png,.webp"
                disabled={busy}
                onChange={(e) => {
                  pickFile(e.target.files?.[0], -1);
                  e.target.value = "";
                }}
              />
            </label>
            {previewSrc(form.photo_path) && (
              <button
                type="button"
                className="ka-reel-delete"
                disabled={busy}
                onClick={removePhoto}
                aria-label="Remove profile photograph"
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  zIndex: 3,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(18, 16, 14, 0.78)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  border: "1.5px solid rgba(255, 255, 255, 0.4)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: busy ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
                  padding: 0,
                  transition: "background 0.2s, transform 0.15s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--artist-rust, #c0392b)";
                  e.currentTarget.style.borderColor = "#fff";
                  e.currentTarget.style.transform = "scale(1.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(18, 16, 14, 0.78)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
                title="Remove profile photo"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
          <div style={{ position: "relative", width: 170, height: 170 }}>
            <label
              data-field="art_photo"
              className={"ka-drop round" + (err("art_photo") ? " ka-input-invalid" : "")}
              title={previewSrc(form.art_photo_path) ? "Click to change art photograph" : "Click to upload art photograph"}
            >
              {previewSrc(form.art_photo_path) ? (
                <img src={previewSrc(form.art_photo_path)} alt="Art photograph preview" />
              ) : (
                <span>Art photograph · shown in the circle</span>
              )}
              {mediaStatus.artPhoto === "uploading" && <UploadPctOverlay ratio={uploadProgress.artPhoto} />}
              <input
                type="file"
                title=""
                aria-label="Upload art photo"
                accept="image/jpeg,image/png,image/webp,image/jpg,.jpg,.jpeg,.png,.webp"
                disabled={busy}
                onChange={(e) => {
                  pickFile(e.target.files?.[0], -3);
                  e.target.value = "";
                }}
              />
            </label>
            {previewSrc(form.art_photo_path) && (
              <button
                type="button"
                className="ka-reel-delete"
                disabled={busy}
                onClick={removeArtPhoto}
                aria-label="Remove art photograph"
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  zIndex: 3,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(18, 16, 14, 0.78)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  border: "1.5px solid rgba(255, 255, 255, 0.4)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: busy ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
                  padding: 0,
                  transition: "background 0.2s, transform 0.15s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--artist-rust, #c0392b)";
                  e.currentTarget.style.borderColor = "#fff";
                  e.currentTarget.style.transform = "scale(1.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(18, 16, 14, 0.78)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
                title="Remove art photo"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
        {(mediaStatus.photo === "error" || mediaStatus.artPhoto === "error") && (
          <p className="kl-error">A photograph failed to upload — re-attach to retry.</p>
        )}
        <FieldError message={err("photo") || err("art_photo")} />
      </fieldset>

      <fieldset className="ka-card" data-field="reels" disabled={locked}>
        <legend>Show us your work</legend>
        <p className="kl-note">
          Two reels required *, two optional. Choose your best reel as primary. The more of your
          work you share, the more opportunities you can open.
        </p>
        <FieldError message={err("reels") || err("primary_reel")} />
        <div className="ka-reels">
          {[0, 1, 2, 3].map((i) => {
            const reelSrc = previewSrc(form.reels[i]);
            return (
            <div
              className={"ka-reel" + (form.primary_reel === i && form.reels[i] ? " primary" : "")}
              key={i}
            >
              {reelSrc ? (
                <div
                  className="ka-reel-preview"
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "9 / 16",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#000",
                  }}
                >
                  <video
                    key={reelSrc}
                    src={`${reelSrc}#t=0.1`}
                    controls
                    playsInline
                    preload="metadata"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  {mediaStatus.reels[i] === "uploading" && (
                    <UploadPctOverlay ratio={uploadProgress.reels[i] ?? 0} />
                  )}
                  {mediaStatus.reels[i] === "error" && (
                    <p className="ka-upload-error">Upload failed — replace to retry</p>
                  )}
                  <button
                    type="button"
                    className="ka-reel-delete"
                    disabled={busy}
                    onClick={() => removeReel(i)}
                    aria-label={`Remove reel ${i + 1}`}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      zIndex: 3,
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "rgba(18, 16, 14, 0.78)",
                      backdropFilter: "blur(6px)",
                      WebkitBackdropFilter: "blur(6px)",
                      border: "1.5px solid rgba(255, 255, 255, 0.4)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: busy ? "not-allowed" : "pointer",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
                      padding: 0,
                      transition: "background 0.2s, transform 0.15s, border-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--artist-rust, #c0392b)";
                      e.currentTarget.style.borderColor = "#fff";
                      e.currentTarget.style.transform = "scale(1.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(18, 16, 14, 0.78)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                    title={`Remove reel ${i + 1}`}
                  >
                    <Trash2 size={15} />
                  </button>
                  <label className="ka-reel-replace" title="Replace this reel">
                    Replace
                    <input
                      type="file"
                      title=""
                      aria-label={`Replace reel ${i + 1}`}
                      accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                      disabled={busy}
                      onChange={(e) => {
                        pickFile(e.target.files?.[0], i);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              ) : (
                <label
                  className="ka-reel-empty"
                  title={`Upload reel ${i + 1}`}
                  style={{
                    aspectRatio: "9 / 16",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                  }}
                >
                  <span>❖</span>
                  Reel {i + 1}
                  <small>{i < 2 ? "Required" : "Optional"}</small>
                  <input
                    type="file"
                    title=""
                    aria-label={`Upload reel ${i + 1}`}
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                    disabled={busy}
                    onChange={(e) => {
                      pickFile(e.target.files?.[0], i);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              <Button
                variant="outline"
                className="ka-star"
                disabled={!form.reels[i]}
                aria-pressed={form.primary_reel === i}
                onClick={() => set("primary_reel", i)}
              >
                {form.primary_reel === i ? "★ Primary" : "☆ Make primary"}
              </Button>
            </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="ka-card" data-field="face_video" disabled={locked}>
        <legend>Identity verification *</legend>
        <p>
          Status: <strong>{verification.replaceAll("_", " ")}</strong>
        </p>
        <h3>1 · Live face video *</h3>
        <p className="kl-note">
          Record 10 seconds: look forward, slowly move your head left and right, and blink your
          eyes. Only Kalzo sees this video.
        </p>
        <FieldError message={err("face_video")} />
        <LiveRecorder kind="face" busy={busy} onDone={pickFace} />
        {previewSrc(form.face_video_path) && (
          <div className="ka-face-preview">
            <video
              className="kl-photo"
              key={previewSrc(form.face_video_path)}
              src={`${previewSrc(form.face_video_path)}#t=0.1`}
              controls
              playsInline
              preload="metadata"
            />
            {mediaStatus.faceVideo === "uploading" && (
              <UploadPctOverlay ratio={uploadProgress.faceVideo} />
            )}
            {submitted && (
              <button
                type="button"
                className="ka-reel-delete"
                disabled={busy}
                onClick={removeFaceVideo}
                aria-label="Remove face video"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  zIndex: 3,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(18, 16, 14, 0.78)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  border: "1.5px solid rgba(255, 255, 255, 0.4)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: busy ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
                  padding: 0,
                  transition: "background 0.2s, transform 0.15s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--artist-rust, #c0392b)";
                  e.currentTarget.style.borderColor = "#fff";
                  e.currentTarget.style.transform = "scale(1.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(18, 16, 14, 0.78)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
                title="Remove face video"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
        {mediaStatus.faceVideo === "error" && (
          <p className="kl-error">Face video upload failed — record again to retry.</p>
        )}
        <h3 data-field="digilocker">2 · DigiLocker Aadhaar check *</h3>
        <p className="kl-note">
          Verify through DigiLocker with your Aadhaar-linked mobile. Kalzo never stores your full
          Aadhaar number. You must finish this before submitting your profile.
        </p>
        <p>
          DigiLocker status:{" "}
          <strong>{kycStatus.replaceAll("_", " ")}</strong>
          {kycDone && kycName ? ` · ${kycName}` : ""}
          {kycDone && kycMasked ? ` · ${kycMasked}` : ""}
        </p>
        {kycDone ? (
          <p className="kx-ok" role="status">
            DigiLocker verified. You can submit your profile.
          </p>
        ) : (
          <Button
            variant="outline"
            disabled={locked || kycBusy}
            onClick={() => void startDigilocker()}
          >
            {kycBusy
              ? "Opening DigiLocker…"
              : kycStatus === "failed"
                ? "Retry DigiLocker check"
                : kycStatus === "pending"
                  ? "Continue DigiLocker check"
                  : "Verify with DigiLocker"}
          </Button>
        )}
      </fieldset>

      <fieldset className="ka-card" disabled={locked}>
        <legend>Bank details for payouts</legend>
        <p className="kl-note">Submitted with your profile. Account number is not shown again after save.</p>
        <div className="kl-form">
          <label data-field="bank_account_holder" className={err("bank_account_holder") ? "ka-field-invalid" : undefined}>
            Account holder name *
            <input
              required
              value={form.bank_account_holder}
              maxLength={100}
              aria-invalid={!!err("bank_account_holder")}
              className={err("bank_account_holder") ? "ka-input-invalid" : undefined}
              onChange={(e) => set("bank_account_holder", e.target.value)}
            />
            <FieldError message={err("bank_account_holder")} />
          </label>
          <label data-field="bank_name" className={err("bank_name") ? "ka-field-invalid" : undefined}>
            Bank name *
            <input
              required
              value={form.bank_name}
              maxLength={100}
              aria-invalid={!!err("bank_name")}
              className={err("bank_name") ? "ka-input-invalid" : undefined}
              onChange={(e) => set("bank_name", e.target.value)}
            />
            <FieldError message={err("bank_name")} />
          </label>
          <label data-field="bank_account_number" className={err("bank_account_number") ? "ka-field-invalid" : undefined}>
            Account number *
            <input
              required
              inputMode="numeric"
              autoComplete="off"
              value={form.bank_account_number}
              maxLength={18}
              aria-invalid={!!err("bank_account_number")}
              className={err("bank_account_number") ? "ka-input-invalid" : undefined}
              onChange={(e) => set("bank_account_number", e.target.value.replace(/\D/g, ""))}
            />
            <FieldError message={err("bank_account_number")} />
          </label>
          <label data-field="bank_ifsc" className={err("bank_ifsc") ? "ka-field-invalid" : undefined}>
            IFSC code *
            <input
              required
              value={form.bank_ifsc}
              maxLength={11}
              aria-invalid={!!err("bank_ifsc")}
              className={err("bank_ifsc") ? "ka-input-invalid" : undefined}
              onChange={(e) => set("bank_ifsc", e.target.value.toUpperCase())}
            />
            <FieldError message={err("bank_ifsc")} />
          </label>
        </div>
      </fieldset>

      <div className="kl-actions" style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Button size="lg" disabled={busy || (!kycDone && !submitted)} onClick={() => void submit()}>
          {busy
            ? (submitted ? "Saving changes…" : "Saving…")
            : submitted
              ? "Save profile changes"
              : !kycDone
                ? "Complete DigiLocker first"
                : "Submit profile for verification"}
        </Button>
        {submitted && (
          <Button
            variant="outline"
            size="lg"
            disabled={busy}
            onClick={() => {
              setIsEditing(false);
              setAlert(null);
              setFieldErrors({});
            }}
          >
            Cancel
          </Button>
        )}
      </div>

      <Dialog open={!!cityAsk} onOpenChange={(o) => !o && setCityAsk(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Performing in {cityAsk?.city}?</DialogTitle>
            <DialogDescription>What will be your hourly rate here?</DialogDescription>
          </DialogHeader>
          {cityAsk && (
            <CityPricing
              value={cityAsk}
              onChange={(pricing) => setCityAsk({ city: cityAsk.city, ...pricing })}
            />
          )}
          <DialogFooter style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={() => setCityAsk(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!cityAsk || !cityRateSchema.safeParse(cityAsk).success) {
                  showAlert({
                    kind: "error",
                    title: "City rate incomplete",
                    message: "Enter a valid hourly rate and travel charges for this city.",
                  });
                  return;
                }
                setForm((f) => {
                  const updatedTravelSetting =
                    cityAsk.travel === "separate"
                      ? "excluding"
                      : cityAsk.travel === "included"
                        ? "including"
                        : f.travel_setting;
                  const updatedTravelCharge =
                    cityAsk.travel === "separate" ? cityAsk.travel_charge : f.travel_charge_inr;
                  const updatedStayCharge =
                    cityAsk.travel === "separate" ? cityAsk.stay_charge : f.stay_charge_inr;

                  return {
                    ...f,
                    rate_inr: (!f.rate_inr || f.rate_inr === 0 || cityAsk.city === f.current_city || cityAsk.city === f.base_city)
                      ? cityAsk.rate
                      : f.rate_inr,
                    travel_setting: updatedTravelSetting,
                    travel_charge_inr: updatedTravelCharge,
                    stay_charge_inr: updatedStayCharge,
                    city_rates: { ...f.city_rates, [cityAsk.city]: normalizedCityRate(cityAsk) },
                  };
                });
                setSavedCity(cityAsk?.city ?? "");
                setCityAsk(null);
                showAlert({
                  kind: "success",
                  title: "City rate saved",
                  message: `Your rate for ${cityAsk.city} is saved and synced with your profile.`,
                });
              }}
            >
              Save city rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
