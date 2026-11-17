import { useEffect, useRef, useState } from "react";
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
import { api, normalizeArtist, unwrapData } from "@/lib/api";
import {
  type ArtistProfileAlert,
  type ArtistProfileField,
  validateArtistProfileSubmit,
} from "./launchRules";
import { ART_FORMS, OTHER } from "./artist/rules";
import { LocationSelect, PreferredCities, stateForCity } from "./artist/LocationFields";
import { CityPricing } from "./artist/CityPricing";
import { normalizedCityRate, cityRateSchema, type CityRate } from "./artist/flowRules";
import { LiveRecorder } from "./artist/LiveRecorder";
import { artistPanelData } from "@/lib/artistPanel.functions";
import { Plane, BedDouble, CircleAlert, CircleCheck, Info } from "lucide-react";
import plaque from "@/assets/kalzo-profile-plaque.png.asset.json";

type PendingFiles = {
  photo: File | null;
  artPhoto: File | null;
  faceVideo: Blob | null;
  reels: (File | null)[];
};

const emptyFiles = (): PendingFiles => ({
  photo: null,
  artPhoto: null,
  faceVideo: null,
  reels: [null, null, null, null],
});

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

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="ka-field-error" role="alert">
      {message}
    </p>
  );
}

export function ArtistProfileEditor() {
  const locationRead = useServerFn(artistPanelData);
  const alertRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState(empty);
  const [files, setFiles] = useState<PendingFiles>(emptyFiles);
  const [alert, setAlert] = useState<ArtistProfileAlert | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ArtistProfileField, string>>>({});
  const [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<Record<string, string>>({}),
    [verification, setVerification] = useState("not_started"),
    [savedCity, setSavedCity] = useState(""),
    [cityAsk, setCityAsk] = useState<({ city: string } & CityRate) | null>(null),
    [customSub, setCustomSub] = useState(false);

  function showAlert(next: ArtistProfileAlert) {
    setAlert(next);
    requestAnimationFrame(() => alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
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

  useEffect(() => {
    void (async () => {
      const res = await api.artists.getProfile();
      if (res.error) {
        // No profile yet — seed early location preference if available.
        if (res.error.status === 404) {
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
          return;
        }
        showAlert({
          kind: "error",
          title: "Could not load your profile",
          message: res.error.message || "Please refresh and try again.",
        });
        return;
      }
      const a = normalizeArtist(unwrapData(res.data));
      if (!a) return;
      const opts = ART_FORMS[a.discipline] ?? [];
      setCustomSub(!!a.subcategory && !opts.includes(a.subcategory));
      setForm({
        ...empty,
        stage_name: a.stage_name,
        legal_name: a.legal_name,
        current_state: a.current_state || stateForCity(a.current_city),
        preferred_states: a.preferred_states,
        discipline: a.discipline,
        subcategory: a.subcategory,
        bio: a.bio,
        base_city: a.base_city,
        state_name: a.state_name,
        current_city: a.current_city,
        rate_inr: a.rate_inr,
        instagram: a.instagram,
        photo_path: a.photo_path,
        art_photo_path: a.art_photo_path,
        face_video_path: a.face_video_path,
        reels: Array.isArray(a.reels)
          ? a.reels.filter((r: unknown): r is string => typeof r === "string")
          : [],
        primary_reel: a.primary_reel,
        pricing_unit: a.pricing_unit as "hour",
        travel_setting: a.travel_setting as "including",
        travel_charge_inr: a.travel_charge_inr,
        stay_charge_inr: a.stay_charge_inr,
        preferred_cities: a.preferred_cities,
        city_rates: (a.city_rates ?? {}) as Record<string, CityRate>,
      });
      setSavedCity(a.current_city);
      setVerification(a.verification_status);
    })();
  }, [locationRead]);

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
    const photo = index === -1 || index === -3;
    if ((photo ? !isImageFile(file) : !isVideoFile(file)) || file.size > 50 * 1024 * 1024) {
      showAlert({
        kind: "error",
        title: photo ? "Photograph not accepted" : "Reel not accepted",
        message: photo
          ? "Please choose a JPG, PNG or WebP image under 50 MB."
          : "Please choose an MP4, WebM or MOV video under 50 MB.",
      });
      return;
    }
    if (index === -1) {
      const key = localPreviewKey("photo");
      setFiles((f) => ({ ...f, photo: file }));
      setLocalPreview(key, file);
      setForm((f) => ({ ...f, photo_path: key }));
      clearField("photo");
    } else if (index === -3) {
      const key = localPreviewKey("art");
      setFiles((f) => ({ ...f, artPhoto: file }));
      setLocalPreview(key, file);
      setForm((f) => ({ ...f, art_photo_path: key }));
      clearField("art_photo");
    } else {
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
    }
    showAlert({
      kind: "info",
      title: "Media ready",
      message: "File attached. Submit your profile to upload everything together.",
    });
  }

  async function pickFace(blob: Blob) {
    const key = localPreviewKey("face");
    setFiles((f) => ({ ...f, faceVideo: blob }));
    setLocalPreview(key, blob);
    setForm((f) => ({ ...f, face_video_path: key }));
    clearField("face_video");
    showAlert({
      kind: "info",
      title: "Face video ready",
      message: "Clip attached. Submit your profile to send it for verification.",
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

  async function submit() {
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
      const fd = new FormData();
      fd.append("stageName", form.stage_name.trim());
      fd.append("legalName", form.legal_name.trim());
      fd.append("baseCity", form.base_city.trim());
      fd.append("stateName", form.state_name.trim());
      fd.append("currentCity", form.current_city.trim());
      fd.append("currentState", form.current_state.trim());
      fd.append("preferredCities", JSON.stringify(form.preferred_cities));
      fd.append("preferredStates", JSON.stringify(form.preferred_states));
      fd.append("discipline", form.discipline.trim());
      fd.append("subcategory", form.subcategory.trim());
      fd.append("bio", form.bio.trim());
      fd.append("instagram", form.instagram.trim());
      fd.append("rateInr", String(form.rate_inr));
      fd.append("pricingUnit", form.pricing_unit);
      fd.append("travelSetting", form.travel_setting);
      fd.append(
        "travelChargeInr",
        String(form.travel_setting === "excluding" ? form.travel_charge_inr : 0),
      );
      fd.append(
        "stayChargeInr",
        String(form.travel_setting === "excluding" ? form.stay_charge_inr : 0),
      );
      fd.append("cityRates", JSON.stringify(form.city_rates));
      fd.append("bankAccountHolder", form.bank_account_holder.trim());
      fd.append("bankName", form.bank_name.trim());
      fd.append("bankAccountNumber", form.bank_account_number.trim());
      fd.append("bankIfsc", form.bank_ifsc.trim().toUpperCase());
      fd.append("photo", files.photo!);
      fd.append("artPhoto", files.artPhoto!);
      fd.append(
        "faceVideo",
        files.faceVideo instanceof File
          ? files.faceVideo
          : new File([files.faceVideo!], "face.webm", { type: files.faceVideo!.type || "video/webm" }),
      );
      const uploadedReels = files.reels
        .map((reel, i) => ({ reel, i }))
        .filter((x): x is { reel: File; i: number } => !!x.reel);
      uploadedReels.forEach(({ reel }) => fd.append("reels", reel));
      const primaryAmong = uploadedReels.findIndex((x) => x.i === form.primary_reel);
      fd.append("primaryReel", String(primaryAmong >= 0 ? primaryAmong : 0));

      const res = await api.artists.saveProfile(fd);
      if (res.error) {
        showAlert({
          kind: "error",
          title: "Profile could not be submitted",
          message: res.error.message || "Please check your details and try again.",
        });
        return;
      }

      const saved = normalizeArtist(unwrapData(res.data));
      setSavedCity(form.current_city);
      setVerification(saved?.verification_status ?? "submitted");
      setFiles(emptyFiles());
      if (saved?.photo_path) setForm((f) => ({
        ...f,
        photo_path: saved.photo_path || f.photo_path,
        art_photo_path: saved.art_photo_path || f.art_photo_path,
        face_video_path: saved.face_video_path || f.face_video_path,
        reels: Array.isArray(saved.reels) && saved.reels.length ? saved.reels : f.reels,
        bank_account_number: "",
        bank_ifsc: f.bank_ifsc ? f.bank_ifsc.slice(0, 4) + "*******" : "",
      }));
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
  const subs = ART_FORMS[form.discipline] ?? [];
  const err = (field: ArtistProfileField) => fieldErrors[field];
  return (
    <>
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

      <fieldset className="ka-card">
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
              {[
                ...Object.keys(ART_FORMS),
                "Artisans",
                "Puppeteers",
                "Influencers",
                "Models",
                "Caterers",
                "Event planners",
              ].map((c) => (
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

      <fieldset className="ka-card">
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

      <fieldset className="ka-card" data-field="photo">
        <legend>Photographs</legend>
        <div className="ka-photos">
          <label className={"ka-drop round" + (err("photo") ? " ka-input-invalid" : "")}>
            {previewSrc(form.photo_path) ? (
              <img src={previewSrc(form.photo_path)} alt="Profile photograph preview" />
            ) : (
              <span>Profile photograph *</span>
            )}
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
        <FieldError message={err("photo") || err("art_photo")} />
      </fieldset>

      <fieldset className="ka-card" data-field="reels">
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

      <fieldset className="ka-card" data-field="face_video">
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
          <video
            className="kl-photo"
            key={previewSrc(form.face_video_path)}
            src={`${previewSrc(form.face_video_path)}#t=0.1`}
            controls
            playsInline
            preload="metadata"
          />
        )}
        <h3>2 · DigiLocker Aadhaar check *</h3>
        <p className="kl-note">
          Verify through DigiLocker with your Aadhaar-linked mobile. Kalzo never stores your full
          Aadhaar number. This required check is not connected yet; your profile cannot be fully
          identity-verified until it is available.
        </p>
        <Button variant="outline" disabled>
          DigiLocker check · opening soon
        </Button>
      </fieldset>

      <fieldset className="ka-card">
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
        <Button size="lg" disabled={busy} onClick={() => void submit()}>
          {busy ? "Saving…" : "Submit profile for verification"}
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
