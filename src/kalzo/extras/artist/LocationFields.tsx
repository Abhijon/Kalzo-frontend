import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { getCachedLocations, loadLocations, type LocationRow } from "./locationsCatalog";

function buildCityOptions(locations: LocationRow[]) {
  return locations
    .flatMap((state) =>
      state.cities.map((city) => ({
        value: city,
        state: state.name,
        label: `${city}, ${state.name}, India`,
      })),
    )
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function stateForCity(city: string) {
  return buildCityOptions(getCachedLocations()).find((c) => c.value === city)?.state ?? "";
}

export function LocationSelect({
  label,
  value,
  onChange,
  state,
  required = false,
  invalid = false,
  error,
  fieldKey,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  state?: boolean | undefined;
  required?: boolean | undefined;
  invalid?: boolean | undefined;
  error?: string | undefined;
  fieldKey?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<LocationRow[]>(getCachedLocations());

  useEffect(() => {
    void loadLocations().then(setLocations);
  }, []);

  const cityOptions = useMemo(() => buildCityOptions(locations), [locations]);
  const choices = state ? locations.map((s) => ({ value: s.name, label: s.name })) : cityOptions;
  const options =
    value && !choices.some((c) => c.value === value) ? [{ value, label: value }, ...choices] : choices;
  const id = `location-${label.replaceAll(" ", "-")}`;
  const errId = `${id}-error`;

  return (
    <div className={"ka-location-field" + (invalid ? " ka-field-invalid" : "")} data-field={fieldKey ?? id}>
      <label id={id}>
        {label}
        {required && (
          <span className="ka-required" aria-label="required">
            *
          </span>
        )}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-labelledby={id}
            aria-required={required}
            aria-invalid={invalid || undefined}
            aria-describedby={error ? errId : undefined}
            className={"ka-location-trigger" + (invalid ? " ka-input-invalid" : "")}
          >
            <span>{options.find((c) => c.value === value)?.label ?? `Choose ${label.toLowerCase()}`}</span>
            <ChevronDown size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="ka-city-search">
          <Command>
            <CommandInput placeholder={state ? "Search state…" : "Search city…"} />
            <CommandList>
              <CommandEmpty>No matching location.</CommandEmpty>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  {option.value === value && <Check size={16} />}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && (
        <p id={errId} className="ka-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function PreferredCities({
  value,
  onChange,
  invalid = false,
  error,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  invalid?: boolean | undefined;
  error?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<LocationRow[]>(getCachedLocations());

  useEffect(() => {
    void loadLocations().then(setLocations);
  }, []);

  const cityOptions = useMemo(() => buildCityOptions(locations), [locations]);

  return (
    <div
      className={"ka-location-field kl-full" + (invalid ? " ka-field-invalid" : "")}
      data-field="preferred_cities"
    >
      <label id="preferred-cities-label">
        Preferred cities <span className="ka-required" aria-label="required">*</span>
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-labelledby="preferred-cities-label"
            aria-invalid={invalid || undefined}
            aria-describedby={error ? "preferred-cities-error" : undefined}
            className={"ka-location-trigger ka-preferred-trigger" + (invalid ? " ka-input-invalid" : "")}
          >
            <span>
              {value.length
                ? value.map((v) => cityOptions.find((c) => c.value === v)?.label ?? v).join("; ")
                : "Choose cities"}
            </span>
            <ChevronDown size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="ka-city-search">
          <Command>
            <CommandInput placeholder="Search preferred city…" />
            <CommandList>
              <CommandEmpty>No matching city.</CommandEmpty>
              {cityOptions.map((c) => (
                <CommandItem
                  key={c.label}
                  value={c.label}
                  onSelect={() =>
                    onChange(
                      value.includes(c.value)
                        ? value.filter((v) => v !== c.value)
                        : [...new Set([...value, c.value])],
                    )
                  }
                >
                  <Check size={16} className={value.includes(c.value) ? "opacity-100" : "opacity-0"} />
                  {c.label}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
          <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
            Done
          </Button>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="ka-location-states">
          {value.map((city) => (
            <span key={city}>
              {city} · {stateForCity(city) || "State not selected"}
            </span>
          ))}
        </div>
      )}
      {error && (
        <p id="preferred-cities-error" className="ka-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
