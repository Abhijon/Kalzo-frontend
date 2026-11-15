import { Button } from "@/components/ui/button";
import type { CityRate } from "./flowRules";
import { Plane, BedDouble } from "lucide-react";
export function CityPricing({ value, onChange }: { value: CityRate; onChange: (value: CityRate) => void }) {
  return <div className="ka-dialog">
    <label>Hourly rate (₹) *<input aria-label="City hourly rate" type="number" min={1} max={100000} value={value.rate} onChange={(e) => onChange({ ...value, rate: Number(e.target.value) })} /></label>
    <div className="ka-toggle" role="radiogroup" aria-label="City travel and accommodation">
      {([["not_needed", "No travel or accommodation needed"], ["included", "Included in my rate"], ["separate", "Charge separately"]] as const).map(([key, label]) => <Button variant="outline" key={key} role="radio" aria-checked={value.travel === key} className={value.travel === key ? "on" : ""} onClick={() => onChange({ ...value, travel: key })}>{label}</Button>)}
    </div>
    {value.travel === "separate" && <div className="kl-form ka-charge-fields"><label><Plane size={16} />Travel charges (₹) *<input aria-label="City travel charges" type="number" min={0} max={500000} value={value.travel_charge} onChange={(e) => onChange({ ...value, travel_charge: Number(e.target.value) })} /></label><label><BedDouble size={16} />Stay and living charges (₹) *<input aria-label="City stay charges" type="number" min={0} max={500000} value={value.stay_charge} onChange={(e) => onChange({ ...value, stay_charge: Number(e.target.value) })} /></label></div>}
  </div>;
}