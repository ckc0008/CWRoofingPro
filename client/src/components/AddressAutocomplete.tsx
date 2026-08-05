import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Loader2 } from "lucide-react";

// Singleton: load the Google Maps Places script once
let scriptPromise: Promise<void> | null = null;

function loadPlacesScript(apiKey: string): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if ((window as any).google?.maps?.places) { resolve(); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => { scriptPromise = null; reject(); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when user picks a suggestion — gives back parsed components */
  onSelect?: (parsed: {
    fullAddress: string;
    streetAddress: string;
    city: string;
    state: string;
    zip: string;
    lat?: number;
    lng?: number;
  }) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
  "data-testid"?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "123 Main St, Houston, TX 77001",
  required,
  className = "",
  style,
  "data-testid": testId,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const serviceRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch the maps API key from the backend
  const { data: configData } = useQuery({
    queryKey: ["/api/config/maps-key"],
    queryFn: () => apiRequest("GET", "/api/config/maps-key").then(r => r.json()),
    staleTime: Infinity,
  });

  const apiKey: string | null = configData?.key ?? null;

  // Load Places script once we have a key
  useEffect(() => {
    if (!apiKey) return;
    loadPlacesScript(apiKey).then(() => {
      const google = (window as any).google;
      serviceRef.current = new google.maps.places.AutocompleteService();
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      setReady(true);
    }).catch(() => {});
  }, [apiKey]);

  // Fetch predictions on input change
  const fetchSuggestions = useCallback((input: string) => {
    if (!ready || !serviceRef.current || input.length < 3) {
      setSuggestions([]);
      return;
    }
    serviceRef.current.getPlacePredictions(
      {
        input,
        sessionToken: sessionTokenRef.current,
        componentRestrictions: { country: "us" },
        types: ["address"],
      },
      (predictions: any[], status: string) => {
        if (status === "OK" && predictions) {
          setSuggestions(predictions);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
        }
      }
    );
  }, [ready]);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    fetchSuggestions(v);
  }

  function pickSuggestion(prediction: any) {
    const google = (window as any).google;
    const placesService = new google.maps.places.PlacesService(document.createElement("div"));
    placesService.getDetails(
      { placeId: prediction.place_id, sessionToken: sessionTokenRef.current, fields: ["address_components", "geometry", "formatted_address"] },
      (place: any, status: string) => {
        if (status !== "OK" || !place) {
          // Fallback: just use the description text
          onChange(prediction.description);
          setSuggestions([]);
          setShowDropdown(false);
          return;
        }
        // Renew session token after a selection
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

        const comps = place.address_components || [];
        const get = (type: string) => comps.find((c: any) => c.types.includes(type))?.long_name || "";
        const getShort = (type: string) => comps.find((c: any) => c.types.includes(type))?.short_name || "";

        const streetNum = get("street_number");
        const route = get("route");
        const streetAddress = [streetNum, route].filter(Boolean).join(" ");
        const city = get("locality") || get("sublocality") || get("administrative_area_level_2");
        const state = getShort("administrative_area_level_1");
        const zip = get("postal_code");
        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();
        const fullAddress = streetAddress || place.formatted_address;

        onChange(fullAddress);
        setSuggestions([]);
        setShowDropdown(false);
        onSelect?.({ fullAddress, streetAddress, city, state, zip, lat, lng });
      }
    );
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const baseInputStyle: React.CSSProperties = {
    background: "var(--color-surface-2)",
    borderColor: "var(--color-border)",
    color: "var(--color-text)",
    fontSize: 14,
    width: "100%",
    height: 36,
    paddingLeft: 36,
    paddingRight: 12,
    borderRadius: 6,
    border: "1px solid var(--color-border)",
    outline: "none",
    ...style,
  };

  return (
    <div className="relative w-full">
      <MapPin
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "var(--color-muted)", zIndex: 1 }}
      />
      <input
        ref={inputRef}
        data-testid={testId}
        type="text"
        value={value}
        onChange={handleInput}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        required={required}
        className={className}
        style={baseInputStyle}
        autoComplete="off"
      />
      {!apiKey && value.length === 0 && (
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
          style={{ color: "var(--color-muted)", fontSize: 10 }}
        >
          Add Google Maps key in Settings for suggestions
        </div>
      )}

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 rounded-lg overflow-hidden shadow-xl"
          style={{
            top: "calc(100% + 4px)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            zIndex: 9999,
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.place_id}
              type="button"
              onMouseDown={() => pickSuggestion(s)}
              className="w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors"
              style={{
                background: "transparent",
                borderBottom: i < suggestions.length - 1 ? "1px solid var(--color-border)" : "none",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <MapPin size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-green)" }} />
              <div>
                <div style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.3 }}>
                  {s.structured_formatting?.main_text || s.description}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 1 }}>
                  {s.structured_formatting?.secondary_text || ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
