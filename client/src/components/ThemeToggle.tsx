import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme !== "light";
  const label = `Switch to ${dark ? "light" : "dark"} mode`;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={label}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {dark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
      <span>{dark ? "Dark" : "Light"}</span>
      <span aria-hidden="true" className={`relative h-4 w-7 rounded-full ${dark ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-foreground transition-transform ${dark ? "translate-x-3.5" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}
