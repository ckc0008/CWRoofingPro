import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, MapPin } from "lucide-react";

interface ParsedAddress {
  fullAddress: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
}

interface AddressSuggestion {
  id: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (parsed: ParsedAddress) => void;
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  const fetchSuggestions = useCallback((rawInput: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const input = rawInput.trim();
    if (input.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    timerRef.current = setTimeout(async () => {
      try {
        const response = await apiRequest(
          "GET",
          `/api/address-autocomplete?q=${encodeURIComponent(input)}`,
        );
        const data = await response.json();
        if (requestId !== requestIdRef.current) return;
        const next = Array.isArray(data?.suggestions) ? data.suggestions : [];
        setSuggestions(next);
        setShowDropdown(next.length > 0);
      } catch {
        if (requestId === requestIdRef.current) {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = e.target.value;
    onChange(nextValue);
    fetchSuggestions(nextValue);
  }

  async function pickSuggestion(suggestion: AddressSuggestion) {
    setResolving(true);
    try {
      const response = await apiRequest(
        "GET",
        `/api/address-resolve?address=${encodeURIComponent(suggestion.description)}`,
      );
      const parsed: ParsedAddress = await response.json();
      onChange(parsed.fullAddress || suggestion.description);
      onSelect?.(parsed);
    } catch {
      onChange(suggestion.description);
    } finally {
      setSuggestions([]);
      setShowDropdown(false);
      setResolving(false);
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
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
    paddingRight: 36,
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
        spellCheck={false}
      />
      {(loading || resolving) && (
        <Loader2
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
          style={{ color: "var(--color-muted)" }}
        />
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
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                void pickSuggestion(suggestion);
              }}
              className="w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors"
              style={{
                background: "transparent",
                borderBottom:
                  index < suggestions.length - 1
                    ? "1px solid var(--color-border)"
                    : "none",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--color-surface-2)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <MapPin
                size={13}
                className="flex-shrink-0 mt-0.5"
                style={{ color: "var(--color-green)" }}
              />
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-text)",
                    lineHeight: 1.3,
                  }}
                >
                  {suggestion.mainText || suggestion.description}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--color-muted)",
                    marginTop: 1,
                  }}
                >
                  {suggestion.secondaryText || suggestion.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
