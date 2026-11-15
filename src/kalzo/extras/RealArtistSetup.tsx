import { useEffect, useState } from "react";
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
import { api } from "@/lib/api";
import { accountData, saveArtistDraft } from "@/lib/kalzo.functions";
import { artistDraftSchema } from "./launchRules";
import { ART_FORMS, OTHER } from "./artist/rules";
import { PayoutForm } from "./artist/PayoutForm";
import { LocationSelect, PreferredCities, stateForCity } from "./artist/LocationFields";
import { CityPricing } from "./artist/CityPricing";
import { normalizedCityRate, cityRateSchema, type CityRate } from "./artist/flowRules";
import { LiveRecorder } from "./artist/LiveRecorder";
import { artistPanelData } from "@/lib/artistPanel.functions";
import { Plane, BedDouble } from "lucide-react";
import plaque from "@/assets/kalzo-profile-plaque.png.asset.json";
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
};
export function ArtistProfileEditor() {
  const read = useServerFn(accountData),
    save = useServerFn(saveArtistDraft),
    locationRead = useServerFn(artistPanelData);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<Record<string, string>>({}),
    [verification, setVerification] = useState("not_started"),
    [savedCity, setSavedCity] = useState(""),
    [cityAsk, setCityAsk] = useState<({ city: string } & CityRate) | null>(null),
    [customSub, setCustomSub] = useState(false),
    [bankSaved, setBankSaved] = useState(false);
  useEffect(() => {
    read()
      .then((d) => {
        if (!d.artist) {
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
        const a = d.artist;
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
            ? a.reels.filter((r): r is string => typeof r === "string")
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
      })
      .catch((e) => setMsg(e.message));
  }, [read, locationRead]);
  useEffect(() => {
    const paths = [
      form.photo_path,
      form.art_photo_path,
      form.face_video_path,
      ...form.reels,
    ].filter(Boolean);
    Promise.all(
      paths.map(async (path) => {
        const { data } = await api.storage.from("kalzo-media").createSignedUrl(path, 600);
        return [path, data?.signedUrl ?? ""] as const;
      }),
    ).then((entries) => setPreview(Object.fromEntries(entries)));
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
  async function upload(file: File | undefined, index: number) {
    if (!file) return;
    if (index === -2) return uploadFace(file);
    const photo = index === -1 || index === -3;
    if (
      (photo
        ? !["image/jpeg", "image/png", "image/webp"].includes(file.type)
        : !["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) ||
      file.size > 50 * 1024 * 1024
    ) {
      setMsg("Choose a JPG, PNG or WebP photo, or MP4/WebM/MOV reel under 50 MB.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.auth.getUser();
      if (!data?.user) throw new Error("Please sign in.");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = data.user.id + "/" + crypto.randomUUID() + "." + ext;
      const { error } = await api.storage
        .from("kalzo-media")
        .upload(path, file);
      if (error) throw error;
      setForm((f) => {
        if (index === -1) return { ...f, photo_path: path };
        if (index === -3) return { ...f, art_photo_path: path };
        const reels = [...f.reels];
        reels[index] = path;
        return { ...f, reels };
      });
      setMsg("Upload saved. Submit your profile to attach it.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  async function uploadFace(file: Blob) {
    setBusy(true);
    try {
      const { data } = await api.auth.getUser();
      if (!data?.user) throw new Error("Please sign in.");
      const path = data.user.id + "/face-" + crypto.randomUUID() + ".webm";
      const { error } = await api.storage
        .from("kalzo-media")
        .upload(path, file);
      if (error) throw error;
      setForm((f) => ({ ...f, face_video_path: path }));
      setMsg("Face video recorded. Submit your profile to send it for verification.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!bankSaved) {
      setMsg("Save your bank details before submitting your profile.");
      return;
    }
    const valid = artistDraftSchema.safeParse({
      ...form,
      travel_charge_inr: form.travel_setting === "excluding" ? form.travel_charge_inr : 0,
      stay_charge_inr: form.travel_setting === "excluding" ? form.stay_charge_inr : 0,
    });
    if (!valid.success) {
      setMsg(valid.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    setBusy(true);
    try {
      await save({ data: valid.data });
      setSavedCity(form.current_city);
      const refreshed = await read();
      setVerification(refreshed.artist?.verification_status ?? "not_started");
      setMsg(
        form.face_video_path
          ? "Profile submitted for verification. Kalzo will compare your face video with your photo and Instagram."
          : "Profile saved. Record your face video to request verification.",
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const subs = ART_FORMS[form.discipline] ?? [];
  return (
    <>
      <section className="kp-plaque" aria-label="Profile preview" style={{ backgroundImage: `url(${plaque.url})` }}>
        <div className="kp-photo">
          {preview[form.photo_path] ? <img src={preview[form.photo_path]} alt="You" /> : <span>Your photo</span>}
        </div>
        <div className="kp-art">
          {preview[form.art_photo_path] ? <img src={preview[form.art_photo_path]} alt="Your art" /> : <span>Art</span>}
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
          <label>
            Stage name *
            <input
              required
              value={form.stage_name}
              maxLength={100}
              onChange={(e) => set("stage_name", e.target.value)}
            />
          </label>
          <label>
            Name as per Aadhaar *
            <input
              required
              value={form.legal_name}
              maxLength={100}
              onChange={(e) => set("legal_name", e.target.value)}
            />
          </label>
          <LocationSelect
            required
            label="Base city"
            value={form.base_city}
            onChange={(city) => {
              set("base_city", city);
              set("state_name", stateForCity(city));
            }}
          />
          <LocationSelect
            required
            label="Base state"
            state
            value={form.state_name}
            onChange={(state) => set("state_name", state)}
          />
          <LocationSelect
            required
            label="Current city"
            value={form.current_city}
            onChange={cityChanged}
          />
          <LocationSelect
            required
            state
            label="Current state"
            value={form.current_state}
            onChange={(state) => set("current_state", state)}
          />
          <label className="kl-full">
            Instagram profile URL *
            <input
              required
              placeholder="https://instagram.com/yourname"
              value={form.instagram}
              maxLength={200}
              onChange={(e) => set("instagram", e.target.value)}
            />
          </label>
          <label>
            Art form *
            <select
              value={form.discipline}
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
          </label>
          <label>
            What kind of {form.discipline.toLowerCase()}? *
            {subs.length > 0 && !customSub ? (
              <select
                value={form.subcategory}
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
                onChange={(e) => set("subcategory", e.target.value)}
              />
            )}
          </label>
        </div>
      </fieldset>

      <fieldset className="ka-card">
        <legend>The value of your performance</legend>
        <div className="kl-form">
          <label>
            Hourly rate in rupees *
            <input
              required
              type="number"
              min={1}
              max={100000}
              value={form.rate_inr}
              onChange={(e) => set("rate_inr", Number(e.target.value))}
            />
          </label>
          <div>
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
          </div>
          {form.travel_setting === "excluding" && (
            <>
              <label>
                <Plane size={16} />
                Travel charges (₹) *
                <input
                  type="number"
                  min={0}
                  value={form.travel_charge_inr}
                  onChange={(e) => set("travel_charge_inr", Number(e.target.value))}
                />
              </label>
              <label>
                <BedDouble size={16} />
                Stay and living charges (₹) *
                <input
                  type="number"
                  min={0}
                  value={form.stay_charge_inr}
                  onChange={(e) => set("stay_charge_inr", Number(e.target.value))}
                />
              </label>
            </>
          )}
          {form.travel_setting === "including" && (
            <p className="kl-note kl-full">Your hourly rate already covers travel and stay.</p>
          )}
          <PreferredCities
            value={form.preferred_cities}
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
          <label className="kl-full">
            About you and your act *
            <textarea
              required
              rows={4}
              maxLength={2000}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="ka-card">
        <legend>Photographs</legend>
        <div className="ka-photos">
          <label className="ka-drop round">
            {preview[form.photo_path] ? (
              <img src={preview[form.photo_path]} alt="" />
            ) : (
              <span>Profile photograph *</span>
            )}
            <input
              type="file"
              aria-label="Upload profile photo"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => void upload(e.target.files?.[0], -1)}
            />
          </label>
          <label className="ka-drop round">
            {preview[form.art_photo_path] ? (
              <img src={preview[form.art_photo_path]} alt="" />
            ) : (
              <span>Art photograph * · shown in the circle</span>
            )}
            <input
              type="file"
              aria-label="Upload art photo"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => void upload(e.target.files?.[0], -3)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="ka-card">
        <legend>Show us your work</legend>
        <p className="kl-note">
          Two reels required *, two optional. Choose your best reel as primary. The more of your
          work you share, the more opportunities you can open.
        </p>
        <div className="ka-reels">
          {[0, 1, 2, 3].map((i) => (
            <div
              className={"ka-reel" + (form.primary_reel === i && form.reels[i] ? " primary" : "")}
              key={i}
            >
              {preview[form.reels[i] ?? ""] ? (
                <video src={preview[form.reels[i] ?? ""]} controls playsInline />
              ) : (
                <label className="ka-reel-empty">
                  <span>❖</span>
                  Reel {i + 1}
                  <small>{i < 2 ? "Required" : "Optional"}</small>
                  <input
                    type="file"
                    aria-label={`Upload reel ${i + 1}`}
                    accept="video/mp4,video/webm,video/quicktime"
                    disabled={busy}
                    onChange={(e) => void upload(e.target.files?.[0], i)}
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
          ))}
        </div>
      </fieldset>

      <fieldset className="ka-card">
        <legend>Identity verification *</legend>
        <p>
          Status: <strong>{verification.replaceAll("_", " ")}</strong>
        </p>
        <h3>1 · Live face video *</h3>
        <p className="kl-note">
          Record 10 seconds: look forward, slowly move your head left and right, and blink your
          eyes. Only Kalzo sees this video.
        </p>
        <LiveRecorder kind="face" busy={busy} onDone={uploadFace} />
        {form.face_video_path && preview[form.face_video_path] && (
          <video className="kl-photo" src={preview[form.face_video_path]} controls playsInline />
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
        <PayoutForm onSaved={setBankSaved} />
      </fieldset>

      <div className="kl-actions">
        <Button size="lg" disabled={busy} onClick={() => void submit()}>
          {busy ? "Saving…" : "Submit profile for verification"}
        </Button>
      </div>
      {msg && <p role="status">{msg}</p>}

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
                  setMsg("Enter a valid city rate and charges.");
                  return;
                }
                setForm((f) => ({
                  ...f,
                  city_rates: { ...f.city_rates, [cityAsk.city]: normalizedCityRate(cityAsk) },
                }));
                setSavedCity(cityAsk?.city ?? "");
                setCityAsk(null);
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
