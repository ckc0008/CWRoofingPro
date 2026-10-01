import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import {
  Ruler, Satellite, MapPin, Plus, Trash2, User,
  ChevronRight, RefreshCw, Home, Layers, GitFork,
  ArrowRight, FileText, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  artemis: { label: "Artemis", color: "#5cbf00" },
  "cw-open-data": { label: "CW RoofScan", color: "#0ea5e9" },
  "google-solar": { label: "Google Solar", color: "#f59e0b" },
  eagleview: { label: "EagleView", color: "#2563eb" },
  nearmap: { label: "Nearmap", color: "#14b8a6" },
  "uploaded-report": { label: "Uploaded Report", color: "#8b5cf6" },
  manual: { label: "Manual", color: "#8b5cf6" },
};

function MeasurementCard({ m, onDelete }: { m: any; onDelete: () => void }) {
  const src = SOURCE_LABELS[m.source] || { label: m.source, color: "#8a9099" };
  return (
    <div
      data-testid={`card-measurement-${m.id}`}
      className="section-panel p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(92,191,0,0.12)", color: "var(--color-green)" }}>
            <Home size={17} />
          </div>
          <div>
            <div className="font-semibold" style={{ fontSize: 14, color: "var(--color-text)" }}>{m.address}</div>
            <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>
              {m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="cw-badge" style={{ color: src.color, background: `${src.color}20`, fontWeight: m.source === "artemis" ? 700 : 400 }}>
            {src.label}{m.source === "artemis" && m.reportUrl ? " ↗" : ""}
          </span>
          <button onClick={onDelete} className="p-1.5 rounded hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-muted)" }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Squares", value: m.squares ?? "—", icon: Layers },
          { label: "Total Sq Ft", value: m.totalArea ? m.totalArea.toLocaleString() : "—", icon: Ruler },
          { label: "Facets", value: m.facets ?? "—", icon: GitFork },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-3 rounded-lg text-center"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
            <div className="font-display font-bold" style={{ fontSize: 20, color: "var(--color-green)" }}>{value}</div>
            <div style={{ fontSize: 10, color: "var(--color-muted)", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Detail Row */}
      <div className="flex gap-4 flex-wrap" style={{ fontSize: 12, color: "var(--color-muted)" }}>
        {m.pitch && m.pitch !== "varies" && <span>Pitch: <span style={{ color: "var(--color-text)" }}>{m.pitch}</span></span>}
        {m.ridgeLength && <span>Ridge: <span style={{ color: "var(--color-text)" }}>{m.ridgeLength} ft</span></span>}
        {m.valleyLength && <span>Valley: <span style={{ color: "var(--color-text)" }}>{m.valleyLength} ft</span></span>}
        {m.eaveLength && <span>Eave: <span style={{ color: "var(--color-text)" }}>{m.eaveLength} ft</span></span>}
        {m.hipLength && <span>Hip: <span style={{ color: "var(--color-text)" }}>{m.hipLength} ft</span></span>}
        {m.rakeLength && <span>Rake: <span style={{ color: "var(--color-text)" }}>{m.rakeLength} ft</span></span>}
        {m.confidence != null && <span>Confidence: <span style={{ color: "var(--color-text)" }}>{Math.round(m.confidence * 100)}%</span></span>}
        {m.imageryDate && <span>Imagery: <span style={{ color: "var(--color-text)" }}>{m.imageryDate}</span></span>}
      </div>

      {/* Linked Lead */}
      {m.linkedLeadId ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "rgba(92,191,0,0.08)", border: "1px solid rgba(92,191,0,0.2)" }}>
          <CheckCircle2 size={13} style={{ color: "var(--color-green)" }} />
          <span style={{ fontSize: 12, color: "var(--color-green)" }}>Linked to Lead #{m.linkedLeadId}</span>
          <Link href={`/crm/${m.linkedLeadId}`}>
            <a className="ml-auto flex items-center gap-1 text-xs" style={{ color: "var(--color-green)" }}>
              View <ChevronRight size={11} />
            </a>
          </Link>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "var(--color-muted)" }}>No lead linked — enter a matching address in CRM to auto-link</div>
      )}

      {/* Artemis Report Link */}
      {m.reportUrl && (
        <a href={m.reportUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "#5cbf00" }}>
          <FileText size={11} /> View Full Artemis Report
        </a>
      )}

      {/* Notes */}
      {m.notes && (
        <div style={{ fontSize: 12, color: "var(--color-muted)", fontStyle: "italic" }}>{m.notes}</div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
        <Link href={`/estimates?address=${encodeURIComponent(m.address)}&squares=${m.squares}`}>
          <a
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: "var(--color-green)", color: "#0a1500" }}
          >
            <FileText size={11} /> Build Estimate
          </a>
        </Link>
      </div>
    </div>
  );
}

export default function Measurements() {
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [lastResult, setLastResult] = useState<any>(null);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);

  const { data: measurements = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/measurements"],
    queryFn: () => apiRequest("GET", "/api/measurements").then(r => r.json()),
  });

  const { data: providerStatus } = useQuery({
    queryKey: ["/api/config/roofscan-status"],
    queryFn: () => apiRequest("GET", "/api/config/roofscan-status").then(r => r.json()),
  });

  const cwWorkerConfigured = providerStatus?.providers?.some(
    (provider: any) => provider.id === "cw-open-data" && provider.configured
  );

  const diagnosticMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/roofscan/diagnostics", data).then(r => r.json()),
    onSuccess: (result) => {
      setDiagnosticsResult(result);
      toast({
        title: "RoofScan Lab diagnostic complete",
        description: "Prototype output loaded. Nothing was saved as a customer measurement.",
      });
    },
    onError: (error: any) => {
      setDiagnosticsResult(null);
      toast({
        title: "RoofScan Lab diagnostic failed",
        description: error?.message || "The CW geospatial worker could not complete the diagnostic.",
        variant: "destructive",
      });
    },
  });

  const measureMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/measurements", data).then(r => r.json()),
    onSuccess: (result) => {
      if (result.saved !== false) {
        queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
      }
      setLastResult(result);
      setAddress("");
      setNotes("");
      const src = SOURCE_LABELS[result.measurement?.source]?.label || result.source;
      const leadMsg = result.linkedLead ? ` Auto-linked to ${result.linkedLead.firstName} ${result.linkedLead.lastName}.` : "";

      if (result.verificationStatus === "prototype" || result.saved === false) {
        toast({
          title: `RoofScan prototype — ${result.measurement?.squares} squares`,
          description: "LiDAR prototype loaded for field review. It was not saved as a verified customer measurement.",
        });
      } else {
        toast({
          title: `Measurement saved — ${result.measurement?.squares} squares`,
          description: `Source: ${src}.${leadMsg}`,
        });
      }
    },
    onError: (error: any) => {
      setLastResult(null);
      toast({
        title: "Verified measurement unavailable",
        description: error?.message || "CW RoofScan did not return a verified measurement. No estimated values were saved.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/measurements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
      toast({ title: "Measurement deleted" });
    },
  });

  function handleMeasure(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    measureMutation.mutate({ address: address.trim(), notes: notes.trim() });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-white" style={{ fontSize: 26 }}>ROOF MEASUREMENTS</h1>
        <p style={{ fontSize: 13, color: "var(--color-muted)" }}>
          Generate verified roof measurements from supported imagery and measurement providers. Results are saved to history and auto-linked to matching leads.
        </p>
        {providerStatus && (
          <div className="mt-3 flex items-center gap-3 px-4 py-2.5 rounded-lg" style={{
            background: providerStatus.ready ? "rgba(92,191,0,0.08)" : "rgba(245,158,11,0.08)",
            border: `1px solid ${providerStatus.ready ? "rgba(92,191,0,0.25)" : "rgba(245,158,11,0.25)"}`,
          }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: providerStatus.ready ? "#5cbf00" : "#f59e0b" }} />
            {providerStatus.ready ? (
              <span style={{ fontSize: 12, color: "#5cbf00", fontWeight: 600 }}>
                CW RoofScan ready — verified results are saved; LiDAR prototype results are shown for field review without being saved.
              </span>
            ) : (
              <span style={{ fontSize: 12, color: "#f59e0b" }}>
                RoofScan provider not configured yet. Measurements will fail safely rather than guess. Configure a supported provider in Settings or upload a verified report.
              </span>
            )}
            <a href="/#/settings" style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-muted)", textDecoration: "underline" }}>Settings</a>
          </div>
        )}
      </div>

      {/* Measurement Input */}
      <div className="section-panel p-6">
        <h3 className="font-display font-bold text-white mb-4" style={{ fontSize: 16 }}>
          MEASURE A ROOF
        </h3>
        <form onSubmit={handleMeasure} className="space-y-4">
          <div>
            <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>PROPERTY ADDRESS</Label>
            <div className="flex gap-3 mt-1">
              <div className="flex-1">
                <AddressAutocomplete
                  data-testid="input-measure-address"
                  value={address}
                  onChange={setAddress}
                  placeholder="123 Main St, Houston, TX 77001"
                  required
                />
              </div>
              <Button
                data-testid="button-roofscan-diagnostics"
                type="button"
                disabled={diagnosticMutation.isPending || !address.trim() || !cwWorkerConfigured}
                onClick={() => diagnosticMutation.mutate({ address: address.trim() })}
                variant="outline"
                className="flex items-center gap-2 font-semibold px-4 flex-shrink-0"
                title={cwWorkerConfigured ? "Run prototype without saving" : "Configure CW RoofScan Worker URL in Settings"}
                style={{ borderColor: "#0ea5e9", color: "#0ea5e9", background: "rgba(14,165,233,0.07)" }}
              >
                {diagnosticMutation.isPending ? (
                  <><RefreshCw size={14} className="animate-spin" /> Lab...</>
                ) : (
                  <><GitFork size={14} /> RoofScan Lab</>
                )}
              </Button>
              <Button
                data-testid="button-measure"
                type="submit"
                disabled={measureMutation.isPending || !address.trim()}
                className="flex items-center gap-2 font-semibold px-6 flex-shrink-0"
                style={{ background: "var(--color-green)", color: "#0a1500" }}
              >
                {measureMutation.isPending ? (
                  <><RefreshCw size={14} className="animate-spin" /> Measuring...</>
                ) : (
                  <><Satellite size={14} /> Measure Roof</>
                )}
              </Button>
            </div>
          </div>
          <div>
            <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>NOTES (OPTIONAL)</Label>
            <Input
              data-testid="input-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Insurance inspection, pre-sale assessment, storm damage..."
              className="mt-1"
              style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
          </div>
        </form>

        {/* RoofScan Lab — prototype output is never persisted */}
        {diagnosticsResult && (
          <div className="mt-5 p-5 rounded-xl" style={{ background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.28)" }}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="font-display font-bold text-white" style={{ fontSize: 15 }}>ROOFSCAN LAB</div>
                <div style={{ fontSize: 11, color: "#0ea5e9", marginTop: 2 }}>
                  Prototype diagnostic only — nothing below was saved to the customer record.
                </div>
              </div>
              <span className="cw-badge" style={{ color: "#0ea5e9", background: "rgba(14,165,233,0.12)" }}>
                {diagnosticsResult.status || "diagnostic"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: "FOOTPRINT SF", value: diagnosticsResult.building?.footprintAreaSqFt?.toLocaleString?.() ?? "—" },
                { label: "LIDAR PRODUCTS", value: diagnosticsResult.provenance?.lidarProductsFound ?? diagnosticsResult.lidarProducts?.length ?? "—" },
                { label: "ROOF PLANES", value: diagnosticsResult.prototype?.planeCount ?? "—" },
                { label: "PROTO ROOF SF", value: diagnosticsResult.prototype?.facetMetrics?.totalRoofAreaSqFt?.toLocaleString?.() ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-lg text-center" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                  <div className="font-display font-bold" style={{ fontSize: 20, color: "#0ea5e9" }}>{value}</div>
                  <div style={{ fontSize: 9, color: "var(--color-muted)", marginTop: 3, letterSpacing: "0.07em" }}>{label}</div>
                </div>
              ))}
            </div>

            {diagnosticsResult.prototype && (
              <div className="flex gap-4 flex-wrap mb-3" style={{ fontSize: 12, color: "var(--color-muted)" }}>
                <span>Pitch: <strong style={{ color: "var(--color-text)" }}>{diagnosticsResult.prototype.dominantPitch ?? "—"}</strong></span>
                <span>Eave: <strong style={{ color: "var(--color-text)" }}>{diagnosticsResult.prototype.exteriorMetrics?.eaveLength ?? "—"} ft</strong></span>
                <span>Rake: <strong style={{ color: "var(--color-text)" }}>{diagnosticsResult.prototype.exteriorMetrics?.rakeLength ?? "—"} ft</strong></span>
                <span>Ridges: <strong style={{ color: "var(--color-text)" }}>{(diagnosticsResult.prototype.candidateEdges || []).filter((edge: any) => edge.type === "ridge").length}</strong></span>
                <span>Hips: <strong style={{ color: "var(--color-text)" }}>{(diagnosticsResult.prototype.candidateEdges || []).filter((edge: any) => edge.type === "hip").length}</strong></span>
                <span>Valleys: <strong style={{ color: "var(--color-text)" }}>{(diagnosticsResult.prototype.candidateEdges || []).filter((edge: any) => edge.type === "valley").length}</strong></span>
              </div>
            )}

            <div style={{ fontSize: 11, color: "var(--color-muted)", lineHeight: 1.5 }}>
              {diagnosticsResult.reason || diagnosticsResult.warning}
            </div>
          </div>
        )}

        {/* Last Result */}
        {lastResult && (
          <div className="mt-5 p-5 rounded-xl" style={{ background: "rgba(92,191,0,0.07)", border: "1px solid rgba(92,191,0,0.25)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-display font-bold text-white" style={{ fontSize: 15 }}>MEASUREMENT RESULT</span>
              <div className="flex items-center gap-2">
                {(lastResult.verificationStatus === "prototype" || lastResult.saved === false) && (
                  <span className="cw-badge" style={{ color: "#f59e0b", background: "rgba(245,158,11,0.14)" }}>
                    PROTOTYPE · NOT SAVED
                  </span>
                )}
                <span className="cw-badge" style={{
                  color: SOURCE_LABELS[lastResult.measurement?.source]?.color || "#8a9099",
                  background: `${SOURCE_LABELS[lastResult.measurement?.source]?.color || "#8a9099"}20`
                }}>
                  {SOURCE_LABELS[lastResult.measurement?.source]?.label || lastResult.source}
                </span>
              </div>
            </div>

            {(lastResult.verificationStatus === "prototype" || lastResult.saved === false) && (
              <div
                className="mb-4 px-4 py-3 rounded-lg"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  color: "#f59e0b",
                  fontSize: 12,
                }}
              >
                Prototype LiDAR geometry for field review only. Compare against field measurements, EagleView, Nearmap, or another verified report before using these quantities in an estimate.
              </div>
            )}

            {/* Big Numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {[
                { label: "SQUARES", value: lastResult.measurement?.squares ?? "—" },
                { label: "TOTAL SQ FT", value: lastResult.measurement?.totalArea?.toLocaleString() ?? "—" },
                { label: "FACETS", value: lastResult.measurement?.facets ?? "—" },
                { label: "PITCH", value: lastResult.measurement?.pitch ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="font-display font-bold" style={{ fontSize: 30, color: "var(--color-green)", lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 10, color: "var(--color-muted)", marginTop: 4, letterSpacing: "0.08em" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Extra dimensions */}
            {(lastResult.measurement?.ridgeLength || lastResult.measurement?.eaveLength) && (
              <div className="flex gap-5 flex-wrap mb-4" style={{ fontSize: 12, color: "var(--color-muted)" }}>
                {lastResult.measurement.ridgeLength && <span>Ridge: <strong style={{ color: "var(--color-text)" }}>{lastResult.measurement.ridgeLength} ft</strong></span>}
                {lastResult.measurement.valleyLength && <span>Valley: <strong style={{ color: "var(--color-text)" }}>{lastResult.measurement.valleyLength} ft</strong></span>}
                {lastResult.measurement.eaveLength && <span>Eave: <strong style={{ color: "var(--color-text)" }}>{lastResult.measurement.eaveLength} ft</strong></span>}
                {lastResult.measurement.hipLength && <span>Hip: <strong style={{ color: "var(--color-text)" }}>{lastResult.measurement.hipLength} ft</strong></span>}
                {lastResult.measurement.rakeLength && <span>Rake: <strong style={{ color: "var(--color-text)" }}>{lastResult.measurement.rakeLength} ft</strong></span>}
                {lastResult.measurement.confidence != null && <span>Confidence: <strong style={{ color: "var(--color-text)" }}>{Math.round(lastResult.measurement.confidence * 100)}%</strong></span>}
              </div>
            )}

            {/* Lead match */}
            {lastResult.linkedLead ? (
              <div className="flex items-center gap-3 p-3 rounded-lg mb-4"
                style={{ background: "rgba(92,191,0,0.1)", border: "1px solid rgba(92,191,0,0.3)" }}>
                <CheckCircle2 size={16} style={{ color: "var(--color-green)" }} />
                <div>
                  <div style={{ fontSize: 13, color: "var(--color-green)", fontWeight: 600 }}>
                    Auto-linked to {lastResult.linkedLead.firstName} {lastResult.linkedLead.lastName}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{lastResult.linkedLead.address}</div>
                </div>
                <Link href={`/crm/${lastResult.linkedLead.id}`}>
                  <a className="ml-auto flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--color-green)" }}>
                    Open Lead <ChevronRight size={12} />
                  </a>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg mb-4"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                <User size={14} style={{ color: "var(--color-muted)" }} />
                <span style={{ fontSize: 12, color: "var(--color-muted)" }}>
                  No matching lead found — add this address to CRM to auto-link future measurements
                </span>
              </div>
            )}

            {/* Build Estimate CTA — only verified/saved measurements can feed estimating */}
            {lastResult.saved !== false && lastResult.verificationStatus !== "prototype" && (
              <Link href="/estimates">
                <a
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-semibold text-sm transition-all"
                  style={{ background: "var(--color-green)", color: "#0a1500" }}
                >
                  <FileText size={14} /> Build Estimate from This Measurement
                  <ArrowRight size={14} />
                </a>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-white" style={{ fontSize: 18 }}>
            MEASUREMENT HISTORY ({measurements.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Loading...</div>
        ) : measurements.length === 0 ? (
          <div className="section-panel p-10 text-center">
            <Satellite size={40} style={{ color: "var(--color-muted)", margin: "0 auto 12px" }} />
            <div style={{ color: "var(--color-text)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No measurements yet</div>
            <div style={{ color: "var(--color-muted)", fontSize: 13 }}>
              Enter an address above to request a verified CW RoofScan measurement
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {measurements.map((m: any) => (
              <MeasurementCard
                key={m.id}
                m={m}
                onDelete={() => deleteMutation.mutate(m.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
