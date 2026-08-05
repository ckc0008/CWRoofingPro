import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, ChevronRight, Phone, Mail, MapPin } from "lucide-react";

// Light theme portal — not the dark admin theme
const PORTAL_STYLES = {
  page: {
    background: "#f8f9fa",
    color: "#1a1a1a",
    minHeight: "100vh",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  accent: "#5CBF00",
  accentDim: "rgba(92,191,0,0.1)",
  muted: "#6b7280",
  divider: "#e5e7eb",
};

function fmt(n: number | null | undefined): string {
  if (n == null) return "$0";
  return `$${Number(n).toLocaleString()}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    draft:    { color: "#6b7280", bg: "#f3f4f6", label: "Draft" },
    sent:     { color: "#d97706", bg: "#fef3c7", label: "Sent" },
    approved: { color: "#16a34a", bg: "#dcfce7", label: "Approved" },
    rejected: { color: "#dc2626", bg: "#fee2e2", label: "Declined" },
  };
  const { color, bg, label } = map[status] ?? map.draft;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 10px",
      borderRadius: 999, fontSize: 12, fontWeight: 600, color, background: bg,
    }}>
      {label}
    </span>
  );
}

function Skeleton({ h = 20, w = "100%", rounded = 6 }: { h?: number; w?: string | number; rounded?: number }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: rounded,
      background: "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
    }} />
  );
}

export default function EstimatePortal() {
  const [, params] = useRoute("/portal/:id");
  const estimateId = params?.id;

  const [accepted, setAccepted] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [changesMsg, setChangesMsg] = useState("");
  const [changesSent, setChangesSent] = useState(false);

  const {
    data: estimate,
    isLoading: loadingEst,
    isError: errorEst,
  } = useQuery({
    queryKey: ["/api/estimates", estimateId],
    queryFn: () => apiRequest("GET", `/api/estimates/${estimateId}`).then(r => r.json()),
    enabled: !!estimateId,
  });

  const {
    data: lead,
    isLoading: loadingLead,
  } = useQuery({
    queryKey: ["/api/leads", estimate?.leadId ? String(estimate.leadId) : null],
    queryFn: () => apiRequest("GET", `/api/leads/${estimate?.leadId}`).then(r => r.json()),
    enabled: !!estimate?.leadId,
  });

  const acceptMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/estimates/${estimateId}`, {
        status: "approved",
        approvedAt: new Date().toISOString(),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId] });
      setAccepted(true);
    },
  });

  if (!estimateId) {
    return (
      <div style={{ ...PORTAL_STYLES.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <h2 style={{ color: "#1a1a1a", fontSize: 20, fontWeight: 700 }}>No Estimate ID</h2>
          <p style={{ color: PORTAL_STYLES.muted, fontSize: 14, marginTop: 8 }}>
            Please use the link provided by CW Roofing & Construction.
          </p>
        </div>
      </div>
    );
  }

  if (loadingEst) {
    return (
      <div style={{ ...PORTAL_STYLES.page, padding: "40px 20px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Header skeleton */}
          <div style={{ ...PORTAL_STYLES.card, padding: 32 }}>
            <Skeleton h={36} w={280} rounded={8} />
            <div style={{ marginTop: 12 }}>
              <Skeleton h={18} w={220} />
            </div>
          </div>
          {/* Content skeleton */}
          <div style={{ ...PORTAL_STYLES.card, padding: 32 }}>
            <Skeleton h={24} w={160} />
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                  <Skeleton h={16} w={160} />
                  <Skeleton h={16} w={80} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  if (errorEst || !estimate) {
    return (
      <div style={{ ...PORTAL_STYLES.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16, color: "#d1d5db" }}>🔍</div>
          <h2 style={{ color: "#1a1a1a", fontSize: 22, fontWeight: 700 }}>Estimate Not Found</h2>
          <p style={{ color: PORTAL_STYLES.muted, fontSize: 14, marginTop: 8, maxWidth: 320 }}>
            This estimate link may have expired or is invalid. Contact CW Roofing & Construction for assistance.
          </p>
          <div style={{ marginTop: 24, padding: "12px 20px", background: "#f3f4f6", borderRadius: 8, display: "inline-block" }}>
            <div style={{ fontSize: 13, color: "#6b7280" }}>📞 (555) 000-0000</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>cwroofingservices.com</div>
          </div>
        </div>
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  const isApproved = accepted || estimate.status === "approved";
  const taxRate = 0.0825;
  const subtotal = (estimate.labor || 0) + (estimate.material || 0) + (estimate.tearOff || 0) +
    (estimate.dumpsterCost || 0) + (estimate.permitCost || 0) + (estimate.gutterCost || 0) +
    (estimate.miscCost || 0);
  const tax = estimate.taxAmount || Math.round((estimate.material || 0) * taxRate);
  const total = estimate.totalAmount || subtotal + tax;

  const lineItems = [
    { label: "Materials", value: estimate.material },
    { label: "Labor", value: estimate.labor },
    { label: "Tear-Off", value: estimate.tearOff },
    { label: "Dumpster", value: estimate.dumpsterCost },
    { label: "Permits & Fees", value: estimate.permitCost },
    estimate.gutterCost > 0 && { label: "Gutters", value: estimate.gutterCost },
    estimate.miscCost > 0 && { label: "Miscellaneous", value: estimate.miscCost },
  ].filter(Boolean) as { label: string; value: number }[];

  const address = lead?.address || "Property Address";
  const validUntil = estimate.createdAt
    ? new Date(new Date(estimate.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
    : "—";

  return (
    <div style={PORTAL_STYLES.page}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (max-width: 600px) {
          .portal-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header / Nav */}
      <header style={{
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: PORTAL_STYLES.accentDim,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 16 }}>🏠</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a", lineHeight: 1.2 }}>
              CW Roofing & Construction
            </div>
            <div style={{ fontSize: 11, color: PORTAL_STYLES.muted }}>Licensed & Insured</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: PORTAL_STYLES.muted }}>cwroofingservices.com</div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>
            Your Roofing Estimate
          </h1>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: PORTAL_STYLES.muted, fontSize: 14 }}>
            <MapPin size={14} />
            <span>{address}</span>
          </div>
        </div>

        {/* Acceptance Success Banner */}
        {isApproved && (
          <div style={{
            background: "#dcfce7", border: "1px solid #86efac", borderRadius: 12,
            padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12,
          }}>
            <CheckCircle size={24} style={{ color: "#16a34a", flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: "#166534", fontSize: 15 }}>
                Estimate Accepted!
              </div>
              <div style={{ color: "#166534", fontSize: 13, marginTop: 2 }}>
                We'll contact you shortly to schedule your project.
              </div>
            </div>
          </div>
        )}

        {/* Estimate Summary Card */}
        <div style={{ ...PORTAL_STYLES.card, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: PORTAL_STYLES.muted, marginBottom: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Estimate Number
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: PORTAL_STYLES.accent }}>
                {estimate.estimateNumber}
              </div>
            </div>
            <StatusBadge status={estimate.status || "sent"} />
          </div>
          <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Property", value: address },
              { label: "Date Prepared", value: estimate.createdAt ? new Date(estimate.createdAt).toLocaleDateString() : "—" },
              { label: "Valid Until", value: validUntil },
              { label: "Roof Type", value: estimate.roofType?.replace(/-/g, " ") || "Asphalt Shingle" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: PORTAL_STYLES.muted, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 500, textTransform: "capitalize" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div style={{ ...PORTAL_STYLES.card, padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>
            Estimate Breakdown
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lineItems.map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${PORTAL_STYLES.divider}` }}>
                <span style={{ fontSize: 14, color: "#374151" }}>{label}</span>
                <span style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 500 }}>{fmt(value)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${PORTAL_STYLES.divider}` }}>
              <span style={{ fontSize: 14, color: "#374151" }}>Subtotal</span>
              <span style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 500 }}>{fmt(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${PORTAL_STYLES.divider}` }}>
              <span style={{ fontSize: 14, color: "#374151" }}>Tax (8.25%)</span>
              <span style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 500 }}>{fmt(tax)}</span>
            </div>
            {/* Total */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 0", marginTop: 4,
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>TOTAL</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: PORTAL_STYLES.accent }}>{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Scope of Work */}
        {estimate.notes && (
          <div style={{ ...PORTAL_STYLES.card, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>
              Scope of Work
            </h2>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {estimate.notes}
            </p>
          </div>
        )}

        {/* Acceptance Section */}
        {!isApproved && (
          <div style={{ ...PORTAL_STYLES.card, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>
              Accept This Estimate
            </h2>
            <p style={{ fontSize: 14, color: PORTAL_STYLES.muted, marginBottom: 20, lineHeight: 1.6 }}>
              By clicking "Accept This Estimate", you authorize CW Roofing & Construction, LLC to proceed with the
              work described above at the price of{" "}
              <strong style={{ color: "#1a1a1a" }}>{fmt(total)}</strong>.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
                style={{
                  background: acceptMutation.isPending ? "#9ca3af" : PORTAL_STYLES.accent,
                  color: "#fff", border: "none",
                  padding: "14px 24px", borderRadius: 8,
                  fontSize: 15, fontWeight: 700, cursor: acceptMutation.isPending ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "background 0.15s",
                }}
              >
                <CheckCircle size={18} />
                {acceptMutation.isPending ? "Processing..." : "Accept This Estimate"}
              </button>

              {!showChanges ? (
                <button
                  onClick={() => setShowChanges(true)}
                  style={{
                    background: "transparent", color: "#374151",
                    border: "1px solid #d1d5db",
                    padding: "12px 24px", borderRadius: 8,
                    fontSize: 14, fontWeight: 500, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  Request Changes <ChevronRight size={14} />
                </button>
              ) : changesSent ? (
                <div style={{
                  padding: "12px 16px", background: "#f0fdf4", border: "1px solid #86efac",
                  borderRadius: 8, color: "#166534", fontSize: 14,
                }}>
                  ✓ Thank you, we'll be in touch shortly to discuss your concerns.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <textarea
                    value={changesMsg}
                    onChange={e => setChangesMsg(e.target.value)}
                    rows={3}
                    placeholder="Describe the changes you'd like..."
                    style={{
                      background: "#f9fafb", border: "1px solid #d1d5db", borderRadius: 8,
                      padding: "10px 12px", fontSize: 14, color: "#1a1a1a", outline: "none",
                      resize: "none", width: "100%", boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setShowChanges(false)}
                      style={{
                        flex: 1, background: "transparent", color: "#6b7280",
                        border: "1px solid #d1d5db", padding: "10px", borderRadius: 8,
                        fontSize: 13, cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setChangesSent(true)}
                      disabled={!changesMsg.trim()}
                      style={{
                        flex: 2, background: changesMsg.trim() ? "#374151" : "#e5e7eb",
                        color: changesMsg.trim() ? "#fff" : "#9ca3af",
                        border: "none", padding: "10px", borderRadius: 8,
                        fontSize: 13, fontWeight: 600, cursor: changesMsg.trim() ? "pointer" : "not-allowed",
                      }}
                    >
                      Send Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div style={{ ...PORTAL_STYLES.card, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>Questions?</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <a href="tel:+15550000000" style={{ display: "flex", alignItems: "center", gap: 6, color: PORTAL_STYLES.accent, fontSize: 13, textDecoration: "none" }}>
              <Phone size={14} /> (555) 000-0000
            </a>
            <a href="mailto:info@cwroofingservices.com" style={{ display: "flex", alignItems: "center", gap: 6, color: PORTAL_STYLES.accent, fontSize: 13, textDecoration: "none" }}>
              <Mail size={14} /> info@cwroofingservices.com
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: "#1a1a1a", color: "#9ca3af",
        padding: "24px 20px", textAlign: "center",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
          CW Roofing & Construction, LLC
        </div>
        <div style={{ fontSize: 12, marginBottom: 4 }}>
          cwroofingservices.com
        </div>
        <div style={{ fontSize: 12, color: PORTAL_STYLES.accent }}>
          Licensed & Insured · Texas
        </div>
      </footer>
    </div>
  );
}
