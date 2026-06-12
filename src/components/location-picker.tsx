import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin } from "lucide-react";
import { COUNTRIES, fuzzCoord } from "@/lib/countries";

const LocationMapPicker = lazy(() =>
  import("@/components/location-map-picker").then((m) => ({ default: m.LocationMapPicker })),
);

export type LocationValue = {
  country: string;
  city: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    suburb?: string;
    state?: string;
    country?: string;
    country_code?: string;
    postcode?: string;
  };
};

const countryToCode = (name: string) =>
  COUNTRIES.find((c) => c.name.toLowerCase() === name.trim().toLowerCase())?.code;

export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}) {
  // ---- Country dropdown ----
  const [countryQuery, setCountryQuery] = useState(value.country);
  const [countryOpen, setCountryOpen] = useState(false);
  useEffect(() => {
    setCountryQuery(value.country);
  }, [value.country]);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES.slice(0, 8);
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [countryQuery]);

  // ---- Place search (city/postcode) via Nominatim ----
  const [placeQuery, setPlaceQuery] = useState(
    [value.postcode, value.city].filter(Boolean).join(" ").trim(),
  );
  const [placeOpen, setPlaceOpen] = useState(false);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCity, setManualCity] = useState(value.city);
  const [manualPostcode, setManualPostcode] = useState(value.postcode);
  const debounce = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounce.current) window.clearTimeout(debounce.current);
    if (manualMode) return;
    if (!placeQuery.trim() || placeQuery.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setSearchError(null);
      return;
    }
    setLoading(true);
    setSearchError(null);
    debounce.current = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const params = new URLSearchParams({
          q: placeQuery,
          format: "json",
          addressdetails: "1",
          limit: "6",
        });
        const code = countryToCode(countryQuery);
        if (code) params.set("countrycodes", code.toLowerCase());
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          signal: ac.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setResults((await res.json()) as NominatimResult[]);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setSearchError("Couldn't reach the address service. You can enter your city manually.");
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    };
  }, [placeQuery, countryQuery, manualMode]);

  const pickCountry = (name: string) => {
    setCountryQuery(name);
    setCountryOpen(false);
    onChange({ ...value, country: name });
  };

  const pickPlace = (r: NominatimResult) => {
    const a = r.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality ?? a.suburb ?? "";
    const country = a.country ?? value.country;
    const postcode = a.postcode ?? "";
    const lat = fuzzCoord(parseFloat(r.lat));
    const lng = fuzzCoord(parseFloat(r.lon));
    setPlaceQuery([postcode, city].filter(Boolean).join(" "));
    setPlaceOpen(false);
    setCountryQuery(country);
    onChange({ country, city, postcode, lat, lng });
  };

  return (
    <div className="space-y-4">
      {/* Country */}
      <div className="space-y-2 relative">
        <Label htmlFor="loc-country">Country</Label>
        <Input
          id="loc-country"
          autoComplete="off"
          value={countryQuery}
          placeholder="Start typing a country…"
          onChange={(e) => {
            setCountryQuery(e.target.value);
            setCountryOpen(true);
          }}
          onFocus={() => setCountryOpen(true)}
          onBlur={() => window.setTimeout(() => setCountryOpen(false), 150)}
        />
        {countryOpen && filteredCountries.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border border-border bg-popover shadow-lg">
            {filteredCountries.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickCountry(c.name);
                  }}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* City / postcode search */}
      {!manualMode ? (
        <div className="space-y-2 relative">
          <Label htmlFor="loc-place">City or postcode</Label>
          <div className="relative">
            <Input
              id="loc-place"
              autoComplete="off"
              value={placeQuery}
              placeholder="e.g. Berlin or 10115"
              onChange={(e) => {
                setPlaceQuery(e.target.value);
                setPlaceOpen(true);
              }}
              onFocus={() => setPlaceOpen(true)}
              onBlur={() => window.setTimeout(() => setPlaceOpen(false), 150)}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {placeOpen &&
            (results.length > 0 || (!loading && placeQuery.trim().length >= 2 && !searchError)) && (
              <ul className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-md border border-border bg-popover shadow-lg">
                {results.length === 0 && !loading && (
                  <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>
                )}
                {results.map((r) => (
                  <li key={r.place_id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-start gap-2"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickPlace(r);
                      }}
                    >
                      <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span className="truncate">{r.display_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          {searchError && <p className="text-xs text-destructive">{searchError}</p>}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Location is fuzzed to ~1 km; your exact address is never stored.
            </p>
            <button
              type="button"
              onClick={() => {
                setManualCity(value.city);
                setManualPostcode(value.postcode);
                setManualMode(true);
              }}
              className="text-xs text-primary hover:underline whitespace-nowrap"
            >
              Enter manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="loc-city-manual">City</Label>
            <Input
              id="loc-city-manual"
              value={manualCity}
              maxLength={100}
              onChange={(e) => {
                setManualCity(e.target.value);
                onChange({ ...value, city: e.target.value });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-postcode-manual">Postcode (optional)</Label>
            <Input
              id="loc-postcode-manual"
              value={manualPostcode}
              maxLength={20}
              onChange={(e) => {
                setManualPostcode(e.target.value);
                onChange({ ...value, postcode: e.target.value });
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Manual entry saves your city for browsing, but you won't appear on the nearby map until
            coordinates are set.{" "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setManualMode(false)}
            >
              Back to search
            </button>
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Fine-tune on map</Label>
        <p className="text-xs text-muted-foreground">
          Click or drag the pin to adjust your approximate position. Coordinates stay fuzzed to ~1
          km.
        </p>
        <Suspense
          fallback={
            <div className="h-64 grid place-items-center rounded-lg border border-border text-xs text-muted-foreground">
              Loading map…
            </div>
          }
        >
          <LocationMapPicker
            lat={value.lat}
            lng={value.lng}
            onChange={(lat, lng) => onChange({ ...value, lat, lng })}
          />
        </Suspense>
        {value.lat != null && value.lng != null && (
          <p className="text-xs text-muted-foreground">
            Saved approx. coordinates: {value.lat.toFixed(2)}, {value.lng.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}
