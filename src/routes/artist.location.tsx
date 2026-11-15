import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin } from "lucide-react";
import { artistPanelData, updateArtistLocation } from "@/lib/artistPanel.functions";
import { LocationSelect, stateForCity } from "@/kalzo/extras/artist/LocationFields";
import { CityPricing } from "@/kalzo/extras/artist/CityPricing";
import { cityRateSchema, normalizedCityRate, type CityRate } from "@/kalzo/extras/artist/flowRules";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { kalzoHead } from "@/lib/routeHead";
export const Route = createFileRoute("/artist/location")({
  head: () =>
    kalzoHead(
      "Location update",
      "Update your current city and performance charges on Kalzo.",
      true,
    ),
  staticData: { sitemap: false },
  component: Location,
});
function Location() {
  const read = useServerFn(artistPanelData),
    save = useServerFn(updateArtistLocation);
  const [artist, setArtist] = useState<Awaited<ReturnType<typeof artistPanelData>>["artist"]>();
  const [city, setCity] = useState(""),
    [state, setState] = useState(""),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [pricing, setPricing] = useState<CityRate>({
    rate: 2000,
    travel: "not_needed",
    travel_charge: 0,
    stay_charge: 0,
  });
  useEffect(() => {
    read()
      .then((d) => {
        setArtist(d.artist);
        setCity(d.artist?.current_city || d.location?.city || "");
        setState(
          d.artist?.current_state ||
            d.location?.state ||
            stateForCity(d.artist?.current_city ?? ""),
        );
        const saved = cityRateSchema.safeParse(d.location?.pricing);
        setPricing(
          saved.success
            ? saved.data
            : {
                rate: d.artist?.rate_inr || 2000,
                travel: "not_needed",
                travel_charge: 0,
                stay_charge: 0,
              },
        );
      })
      .catch((e) => setMessage(e.message));
  }, [read]);
  async function submit() {
    const valid = cityRateSchema.safeParse(pricing);
    if (!valid.success) {
      setMessage("Enter a valid hourly rate and charges.");
      return;
    }
    setBusy(true);
    try {
      await save({ data: { city, state, pricing: normalizedCityRate(valid.data) } });
      setOpen(false);
      setMessage("Your location and city charges are saved.");
      const d = await read();
      setArtist(d.artist);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save location.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="ka-location-intro">
        <MapPin size={38} />
        <div>
          <h2>Where the next mehfil finds you</h2>
          <p>
            Currently in {artist?.current_city || artist?.base_city || city || "Choose your city"}
            {artist?.current_state ? `, ${artist.current_state}` : ""}
          </p>
        </div>
      </section>
      {artist === undefined && <p role="status">{message || "Loading your saved city…"}</p>}
      <div className="kl-form">
        <LocationSelect
          required
          label="Current city"
          value={city}
          onChange={(c) => {
            setCity(c);
            setState(stateForCity(c));
            const found = cityRateSchema.safeParse(
              ((artist?.city_rates ?? {}) as Record<string, unknown>)[c],
            );
            setPricing(
              found.success
                ? found.data
                : {
                    rate: artist?.rate_inr || pricing.rate,
                    travel: "not_needed",
                    travel_charge: 0,
                    stay_charge: 0,
                  },
            );
            setOpen(true);
          }}
        />
        <LocationSelect required state label="Current state" value={state} onChange={setState} />
      </div>
      <div className="kl-actions">
        <Button onClick={() => setOpen(true)} disabled={artist === undefined || !city || !state}>
          Update city & charges
        </Button>
      </div>
      {message && <p role="status">{message}</p>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your performance in {city}</DialogTitle>
            <DialogDescription>
              Set your hourly rate and travel or accommodation charges for this city.
            </DialogDescription>
          </DialogHeader>
          <CityPricing value={pricing} onChange={setPricing} />
          <Button disabled={busy || !city || !state} onClick={() => void submit()}>
            {busy ? "Saving…" : "Save location update"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
