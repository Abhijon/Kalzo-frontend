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
import { artistPanelData } from "@/lib/artistPanel.functions";
import { Plane, BedDouble, CircleAlert, CircleCheck, Info } from "lucide-react";
import plaque from "@/assets/kalzo-profile-plaque.png.asset.json";

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
  rate_inr: 2000,
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

function ProfileAlertBanner({ alert }: { alert: ArtistProfileAlert }) {
  const Icon = alert.kind === "error" ? CircleAlert : alert.kind === "success" ? CircleCheck : Info;
  return (
    <div
      className={`ka-alert ka-alert-${alert.kind}`}
      role={alert.kind === "error" ? "alert" : "status"}
      aria-live={alert.kind === "error" ? "assertive" : "polite"}
    >
      <Icon size={20} aria-hidden="true" />
      <div>
        <strong>{alert.title}</strong>
        <p>{alert.message}</p>
      </div>
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

/** Profile already has the media from POST /artist/profile — edits wait for PATCH. */
function isSubmittedProfile(a: {
  photo_path?: string;
  face_video_path?: string;
  reels?: unknown;
}) {
  const reels = Array.isArray(a.reels) ? a.reels.filter((r) => typeof r === "string" && r) : [];
  return !!(a.photo_path && a.face_video_path && reels.length >= 2);
}

export function ArtistProfileEditor() {
  const locationRead = useServerFn(artistPanelData);
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
    [customSub, setCustomSub] = useState(false);

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
          setKeys((k) => ({ ...k, [slot]: key }));
          setMediaStatus((s) => ({ ...s, [slot]: "ready" }));
        } else {
          setKeys((k) => {
            const reels = [...k.reels];
            reels[slot.reel] = key;
            return { ...k, reels };
          });
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
      const draft = await loadArtistProfileDraft();
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
            void locationRead().then((x) => {
              if (!x.location) return;
              const p = cityRateSchema.safeParse(x.location.pricing);
              setForm((f) => ({
                ...f,
                current_city: x.location?.city ?? "",
                current_state: x.location?.state ?? "",
                rate_inr: p.success ? p.data.rate : f.rate_inr,
                city_rates: p.success ? { [x.location?.city ?? ""]: p.data } : f.city_rates,
              }));
            });
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
        setCustomSub(!!a.subcategory && !opts.includes(a.subcategory));
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
          rate_inr: a.rate_inr || empty.rate_inr,
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
        current_state: a.current_state || stateForCity(a.current_city),
        preferred_states: Array.isArray(a.preferred_states) ? a.preferred_states : [],
        discipline: a.discipline || empty.discipline,
        subcategory: a.subcategory || "",
        bio: a.bio || "",
        base_city: a.base_city || "",
        state_name: a.state_name || "",
        current_city: a.current_city || "",
        rate_inr: a.rate_inr || empty.rate_inr,
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
        bank_account_number: "",
        bank_ifsc: a.bank_ifsc || "",
      });
      setSavedCity(a.current_city || "");
      setLoading(false);
    })();
  }, [locationRead]);

  // Keep a local draft so DigiLocker redirects don't wipe the form.
  useEffect(() => {
    if (loading || submitted) return;
    const persist = () => {
      void saveArtistProfileDraft({
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
  }, [form, files, customSub, savedCity, loading, submitted]);

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
      rate: prev?.rate ?? form.rate_inr,
      travel: prev?.travel ?? "not_needed",
      travel_charge: prev?.travel_charge ?? 0,
      stay_charge: prev?.stay_charge ?? 0,
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

  function previewSrc(path: string | undefined) {
    if (!path) return "";
    return preview[path] ?? "";
  }

  function runValidation() {
    const reelCount = files.reels.filter(Boolean).length;
    return validateArtistProfileSubmit({
      ...form,
      has_photo: !!files.photo,
      has_art_photo: !!files.artPhoto,
      has_face_video: !!files.faceVideo,
      reel_count: reelCount,
      has_primary_reel: !!files.reels[form.primary_reel],
    });
  }

  async function startDigilocker() {
    if (kycDone || submitted || kycBusy) return;
    setKycBusy(true);
    setAlert(null);
    try {
      // Persist before Surepass navigates away so filled details survive the round-trip.
      await saveArtistProfileDraft({
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
    if (submitted) {
      showAlert({
        kind: "info",
        title: "Profile already submitted",
        message: "Your submitted details are shown here. Profile edits and extra reels will use a PATCH update later.",
      });
      return;
    }
    if (!kycDone) {
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
    const result = runValidation();
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
      showAlert({
        kind: "success",
        title: "Profile submitted for verification",
        message:
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
  const locked = submitted || busy;
  if (loading) {
    return <p className="kl-note">Loading your submitted profile…</p>;
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
      <div ref={alertRef}>{alert && <ProfileAlertBanner alert={alert} />}</div>
     
      <section className="kp-plaque" aria-label="Profile preview" style={{ backgroundImage: `url(${plaque.url})` }}>
        <div className="kp-photo">
          {previewSrc(form.photo_path) ? <img src={previewSrc(form.photo_path)} alt="You" /> : <span>Your photo</span>}
        </div>
        <div className="kp-art">
          {previewSrc(form.art_photo_path) ? <img src={previewSrc(form.art_photo_path)} alt="Your art" /> : <span>Art</span>}
        </div>
        <i className="kp-badge">{verification.replaceAll("_", " ")}</i>
        <div className="kp-text">
          <small>Stage Name:</small>
          <strong>{form.stage_name || "Your stage name"}</strong>
          <p><span>Art:</span><em>{form.subcategory || form.discipline}</em></p>
          <p><span>Base City:</span><em>{form.base_city || "Base city"}</em></p>
          <p><span>Rate:</span><b>₹{form.rate_inr.toLocaleString("en-IN")} / hour</b></p>
        </div>
      </section>

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
            <select
              value={form.discipline}
              aria-invalid={!!err("discipline")}
              className={err("discipline") ? "ka-input-invalid" : undefined}
              onChange={(e) => {
                set("discipline", e.target.value);
                set("subcategory", "");
                setCustomSub(false);
              }}
            >
              {Object.keys(artForms).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <FieldError message={err("discipline")} />
          </label>
          <label data-field="subcategory" className={err("subcategory") ? "ka-field-invalid" : undefined}>
            What kind of {form.discipline.toLowerCase()}? *
            {subs.length > 0 && !customSub ? (
              <select
                value={form.subcategory}
                aria-invalid={!!err("subcategory")}
                className={err("subcategory") ? "ka-input-invalid" : undefined}
                onChange={(e) =>
                  e.target.value === OTHER
                    ? (setCustomSub(true), set("subcategory", ""))
                    : set("subcategory", e.target.value)
                }
              >
                <option value="">Choose…</option>
                {subs.map((s) => (
                  <option key={s}>{s}</option>
                ))}
                <option>{OTHER}</option>
              </select>
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
              value={form.rate_inr}
              aria-invalid={!!err("rate_inr")}
              className={err("rate_inr") ? "ka-input-invalid" : undefined}
              onChange={(e) => set("rate_inr", Number(e.target.value))}
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
                  value={form.travel_charge_inr}
                  aria-invalid={!!err("travel_charge_inr")}
                  className={err("travel_charge_inr") ? "ka-input-invalid" : undefined}
                  onChange={(e) => set("travel_charge_inr", Number(e.target.value))}
                />
                <FieldError message={err("travel_charge_inr")} />
              </label>
              <label data-field="stay_charge_inr" className={err("stay_charge_inr") ? "ka-field-invalid" : undefined}>
                <BedDouble size={16} />
                Stay and living charges (₹) *
                <input
                  type="number"
                  min={0}
                  value={form.stay_charge_inr}
                  aria-invalid={!!err("stay_charge_inr")}
                  className={err("stay_charge_inr") ? "ka-input-invalid" : undefined}
                  onChange={(e) => set("stay_charge_inr", Number(e.target.value))}
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
            <p className="kl-full kl-note">
              City rates:{" "}
              {Object.entries(form.city_rates)
                .map(([c, r]) => `${c} ₹${r.rate}/hr (${r.travel.replace("_", " ")})`)
                .join(" · ")}
            </p>
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
          <label className={"ka-drop round" + (err("photo") ? " ka-input-invalid" : "")}>
            {previewSrc(form.photo_path) ? (
              <img src={previewSrc(form.photo_path)} alt="Profile photograph preview" />
            ) : (
              <span>Profile photograph *</span>
            )}
            {mediaStatus.photo === "uploading" && <UploadPctOverlay ratio={uploadProgress.photo} />}
            <input
              type="file"
              aria-label="Upload profile photo"
              accept="image/jpeg,image/png,image/webp,image/jpg,.jpg,.jpeg,.png,.webp"
              disabled={busy}
              onChange={(e) => {
                pickFile(e.target.files?.[0], -1);
                e.target.value = "";
              }}
            />
          </label>
          <label data-field="art_photo" className={"ka-drop round" + (err("art_photo") ? " ka-input-invalid" : "")}>
            {previewSrc(form.art_photo_path) ? (
              <img src={previewSrc(form.art_photo_path)} alt="Art photograph preview" />
            ) : (
              <span>Art photograph * · shown in the circle</span>
            )}
            {mediaStatus.artPhoto === "uploading" && <UploadPctOverlay ratio={uploadProgress.artPhoto} />}
            <input
              type="file"
              aria-label="Upload art photo"
              accept="image/jpeg,image/png,image/webp,image/jpg,.jpg,.jpeg,.png,.webp"
              disabled={busy}
              onChange={(e) => {
                pickFile(e.target.files?.[0], -3);
                e.target.value = "";
              }}
            />
          </label>
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
                <div className="ka-reel-preview">
                  <video
                    key={reelSrc}
                    src={`${reelSrc}#t=0.1`}
                    controls
                    playsInline
                    preload="metadata"
                  />
                  {mediaStatus.reels[i] === "uploading" && (
                    <UploadPctOverlay ratio={uploadProgress.reels[i] ?? 0} />
                  )}
                  {mediaStatus.reels[i] === "error" && (
                    <p className="ka-upload-error">Upload failed — replace to retry</p>
                  )}
                  <label className="ka-reel-replace">
                    Replace
                    <input
                      type="file"
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
                <label className="ka-reel-empty">
                  <span>❖</span>
                  Reel {i + 1}
                  <small>{i < 2 ? "Required" : "Optional"}</small>
                  <input
                    type="file"
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
        {!submitted && <LiveRecorder kind="face" busy={busy} onDone={pickFace} />}
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

      <div className="kl-actions">
        <Button size="lg" disabled={busy || submitted || !kycDone} onClick={() => void submit()}>
          {busy
            ? "Saving…"
            : submitted
              ? "Profile submitted"
              : !kycDone
                ? "Complete DigiLocker first"
                : "Submit profile for verification"}
        </Button>
      </div>
      {alert && <ProfileAlertBanner alert={alert} />}

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
          <DialogFooter>
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
                setForm((f) => ({
                  ...f,
                  city_rates: { ...f.city_rates, [cityAsk.city]: normalizedCityRate(cityAsk) },
                }));
                setSavedCity(cityAsk?.city ?? "");
                setCityAsk(null);
                showAlert({
                  kind: "success",
                  title: "City rate saved",
                  message: `Your rate for ${cityAsk.city} is ready for bookings there.`,
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
