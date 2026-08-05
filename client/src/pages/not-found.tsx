import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full" style={{ color: "var(--color-muted)" }}>
      <div className="font-display font-bold text-white mb-2" style={{ fontSize: 48 }}>404</div>
      <div style={{ fontSize: 16, marginBottom: 16 }}>Page not found</div>
      <Link href="/">
        <a style={{ color: "var(--color-green)", fontSize: 14 }}>← Back to Dashboard</a>
      </Link>
    </div>
  );
}
