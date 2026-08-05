import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "./Dashboard";
import { Plus, Ruler, Calculator, Satellite, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const LABOR_PER_SQUARE = 75;
const MATERIAL_PER_SQUARE = 120;
const TEAR_OFF_PER_SQUARE = 45;
const DUMPSTER = 400;
const PERMIT = 150;

function calcEstimate(squares: number, pitch: string, hasGutter: boolean, gutterLf: number) {
  const pitchMult = parseFloat(pitch?.split("/")[0] || "6") > 8 ? 1.15 : 1;
  const labor = Math.round(squares * LABOR_PER_SQUARE * pitchMult);
  const material = Math.round(squares * MATERIAL_PER_SQUARE);
  const tearOff = Math.round(squares * TEAR_OFF_PER_SQUARE);
  const dumpster = DUMPSTER;
  const permit = PERMIT;
  const gutter = hasGutter ? gutterLf * 8 : 0;
  const subtotal = labor + material + tearOff + dumpster + permit + gutter;
  const taxRate = 0.0825;
  const taxAmount = Math.round(material * taxRate); // Tax on materials only (TX)
  const total = subtotal + taxAmount;
  return { labor, material, tearOff, dumpsterCost: dumpster, permitCost: permit, gutterCost: gutter, subtotal, taxRate, taxAmount, totalAmount: total };
}

function EstimateBuilder({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [leadId, setLeadId] = useState("");
  const [measuring, setMeasuring] = useState(false);
  const [measureData, setMeasureData] = useState<any>(null);
  const [squares, setSquares] = useState("20");
  const [pitch, setPitch] = useState("6/12");
  const [roofType, setRoofType] = useState("asphalt-shingle");
  const [hasGutter, setHasGutter] = useState(false);
  const [gutterLf, setGutterLf] = useState("120");
  const [notes, setNotes] = useState("");

  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
    queryFn: () => apiRequest("GET", "/api/leads").then(r => r.json()),
  });

  const calcs = calcEstimate(Number(squares) || 0, pitch, hasGutter, Number(gutterLf) || 0);

  async function measureAddress() {
    if (!address) return;
    setMeasuring(true);
    try {
      const res = await apiRequest("POST", "/api/measure", { address });
      const data = await res.json();
      setMeasureData(data);
      if (data.squares) setSquares(String(data.squares));
      if (data.pitch) setPitch(data.pitch);
      toast({ title: "Measurement complete", description: `${data.squares} squares detected` });
    } catch {
      toast({ title: "Measurement failed", variant: "destructive" });
    }
    setMeasuring(false);
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/estimates", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      toast({ title: "Estimate created", description: `Total: $${calcs.totalAmount.toLocaleString()}` });
      onClose();
    },
  });

  function submit() {
    if (!leadId) { toast({ title: "Select a lead", variant: "destructive" }); return; }
    createMutation.mutate({
      leadId: Number(leadId),
      roofSquares: Number(squares),
      roofPitch: pitch,
      roofType,
      ...calcs,
      measurementMethod: measureData?.source || "manual",
      measurementData: measureData ? JSON.stringify(measureData) : null,
      addressLat: measureData?.lat,
      addressLng: measureData?.lng,
      notes,
    });
  }

  return (
    <div className="space-y-5">
      {/* Step 1: Select Lead + Address */}
      <div className="p-4 rounded-lg" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
        <div className="font-display font-bold text-white mb-3" style={{ fontSize: 14 }}>
          1 — SELECT LEAD & ADDRESS
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>LEAD</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger data-testid="select-lead" className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
                <SelectValue placeholder="Select a lead..." />
              </SelectTrigger>
              <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                {leads.map((l: any) => (
                  <SelectItem key={l.id} value={String(l.id)} style={{ color: "var(--color-text)" }}>
                    {l.firstName} {l.lastName} — {l.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>PROPERTY ADDRESS (for satellite measurement)</Label>
            <div className="flex gap-2 mt-1">
              <div className="flex-1">
                <AddressAutocomplete
                  data-testid="input-measure-address"
                  value={address}
                  onChange={setAddress}
                  placeholder="123 Main St, Houston, TX 77001"
                  style={{ background: "var(--color-surface)" }}
                />
              </div>
              <Button
                data-testid="button-measure"
                onClick={measureAddress}
                disabled={measuring || !address}
                className="flex-shrink-0 flex items-center gap-1.5 font-semibold"
                style={{ background: "var(--color-green)", color: "#0a1500", fontSize: 12 }}
              >
                <Satellite size={13} />
                {measuring ? "Measuring..." : "Measure"}
              </Button>
            </div>
            {measureData && (
              <div className="mt-2 p-3 rounded-lg flex flex-wrap gap-4"
                style={{ background: "rgba(92,191,0,0.08)", border: "1px solid rgba(92,191,0,0.2)" }}>
                <div className="text-center">
                  <div className="font-bold" style={{ fontSize: 22, color: "var(--color-green)" }}>{measureData.squares}</div>
                  <div style={{ fontSize: 10, color: "var(--color-muted)" }}>SQUARES</div>
                </div>
                <div className="text-center">
                  <div className="font-bold" style={{ fontSize: 22, color: "var(--color-green)" }}>{measureData.totalArea?.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: "var(--color-muted)" }}>SQ FT</div>
                </div>
                {measureData.facets && (
                  <div className="text-center">
                    <div className="font-bold" style={{ fontSize: 22, color: "var(--color-green)" }}>{measureData.facets}</div>
                    <div style={{ fontSize: 10, color: "var(--color-muted)" }}>FACETS</div>
                  </div>
                )}
                <div className="flex-1 self-end">
                  <span style={{ fontSize: 10, color: "var(--color-muted)" }}>
                    Source: {measureData.source === "google-solar" ? "Google Solar API" : measureData.source === "demo" ? "Demo Data" : "Estimated"}
                    {measureData.note && ` — ${measureData.note}`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step 2: Measurements */}
      <div className="p-4 rounded-lg" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
        <div className="font-display font-bold text-white mb-3" style={{ fontSize: 14 }}>2 — MEASUREMENTS & SCOPE</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>ROOF SQUARES *</Label>
            <Input data-testid="input-squares" type="number" value={squares} onChange={e => setSquares(e.target.value)} min="1"
              className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
          </div>
          <div>
            <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>PITCH</Label>
            <Select value={pitch} onValueChange={setPitch}>
              <SelectTrigger data-testid="select-pitch" className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                {["3/12", "4/12", "5/12", "6/12", "7/12", "8/12", "9/12", "10/12", "12/12"].map(p =>
                  <SelectItem key={p} value={p} style={{ color: "var(--color-text)" }}>{p}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>MATERIAL TYPE</Label>
            <Select value={roofType} onValueChange={setRoofType}>
              <SelectTrigger data-testid="select-roofType-est" className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                {["asphalt-shingle", "metal", "tile", "tpo-flat", "wood-shake"].map(t =>
                  <SelectItem key={t} value={t} style={{ color: "var(--color-text)" }}>{t.replace(/-/g, " ")}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <input type="checkbox" id="gutters" checked={hasGutter} onChange={e => setHasGutter(e.target.checked)}
            className="w-4 h-4 rounded" style={{ accentColor: "var(--color-green)" }} />
          <label htmlFor="gutters" style={{ fontSize: 13, color: "var(--color-text)", cursor: "pointer" }}>Include Gutters</label>
          {hasGutter && (
            <div className="flex items-center gap-2 ml-4">
              <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>LINEAR FT:</Label>
              <Input type="number" value={gutterLf} onChange={e => setGutterLf(e.target.value)} className="w-20"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Live Estimate */}
      <div className="p-4 rounded-lg" style={{ background: "rgba(92,191,0,0.06)", border: "1px solid rgba(92,191,0,0.2)" }}>
        <div className="font-display font-bold text-white mb-3" style={{ fontSize: 14 }}>3 — INSTANT ESTIMATE</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["Labor", calcs.labor],
            ["Materials", calcs.material],
            ["Tear-Off", calcs.tearOff],
            ["Dumpster", calcs.dumpsterCost],
            ["Permit", calcs.permitCost],
            hasGutter ? ["Gutters", calcs.gutterCost] : null,
          ].filter(Boolean).map(([k, v]) => (
            <div key={k as string} className="flex justify-between py-1.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13 }}>
              <span style={{ color: "var(--color-muted)" }}>{k}</span>
              <span style={{ color: "var(--color-text)" }}>${(v as number).toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between py-1.5 col-span-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13 }}>
            <span style={{ color: "var(--color-muted)" }}>Subtotal</span>
            <span style={{ color: "var(--color-text)" }}>${calcs.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1.5 col-span-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13 }}>
            <span style={{ color: "var(--color-muted)" }}>Tax (8.25%)</span>
            <span style={{ color: "var(--color-text)" }}>${calcs.taxAmount.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(92,191,0,0.3)" }}>
          <span className="font-display font-bold text-white" style={{ fontSize: 18 }}>TOTAL</span>
          <span className="font-display font-bold" style={{ fontSize: 24, color: "var(--color-green)" }}>
            ${calcs.totalAmount.toLocaleString()}
          </span>
        </div>
      </div>

      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>NOTES</Label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Additional scope items, material upgrades, special conditions..."
          className="w-full mt-1 rounded-md px-3 py-2 text-sm resize-none"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)", outline: "none" }} />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1"
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent" }}>
          Cancel
        </Button>
        <Button data-testid="button-create-estimate" onClick={submit} className="flex-1 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}
          disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : `Create Estimate — $${calcs.totalAmount.toLocaleString()}`}
        </Button>
      </div>
    </div>
  );
}

export default function Estimates() {
  const [showBuilder, setShowBuilder] = useState(false);
  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ["/api/estimates"],
    queryFn: () => apiRequest("GET", "/api/estimates").then(r => r.json()),
  });

  const totalPending = estimates.filter((e: any) => e.status === "sent").reduce((s: number, e: any) => s + (e.totalAmount || 0), 0);
  const totalApproved = estimates.filter((e: any) => e.status === "approved").reduce((s: number, e: any) => s + (e.totalAmount || 0), 0);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white" style={{ fontSize: 26 }}>ESTIMATES</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Satellite-powered instant quotes</p>
        </div>
        <Button data-testid="button-new-estimate" onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}>
          <Plus size={15} /> Build Estimate
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Estimates", value: estimates.length, color: "#8a9099" },
          { label: "Pending Value", value: `$${(totalPending / 1000).toFixed(1)}K`, color: "#f59e0b" },
          { label: "Approved Value", value: `$${(totalApproved / 1000).toFixed(1)}K`, color: "#22c55e" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="font-display font-bold" style={{ fontSize: 26, color }}>{value}</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="section-panel overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Loading...</div>
        ) : estimates.length === 0 ? (
          <div className="p-12 text-center">
            <Calculator size={40} style={{ color: "var(--color-muted)", margin: "0 auto 12px" }} />
            <div style={{ color: "var(--color-text)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No estimates yet</div>
            <div style={{ color: "var(--color-muted)", fontSize: 13 }}>Click "Build Estimate" to create your first instant quote</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Estimate #</th><th>Lead</th><th>Squares</th><th>Type</th>
                  <th>Measurement</th><th>Total</th><th>Status</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {estimates.map((e: any) => (
                  <tr key={e.id} data-testid={`row-est-${e.id}`}>
                    <td style={{ color: "var(--color-green)", fontSize: 13 }}>{e.estimateNumber}</td>
                    <td style={{ fontSize: 12, color: "var(--color-text)" }}>Lead #{e.leadId}</td>
                    <td style={{ fontSize: 13, color: "var(--color-text)" }}>{e.roofSquares || "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--color-text)", textTransform: "capitalize" }}>{e.roofType?.replace(/-/g, " ")}</td>
                    <td>
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-muted)" }}>
                        {e.measurementMethod === "google-solar" ? <Satellite size={11} style={{ color: "var(--color-green)" }} /> : <Ruler size={11} />}
                        {e.measurementMethod}
                      </span>
                    </td>
                    <td style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
                      {e.totalAmount ? `$${e.totalAmount.toLocaleString()}` : "—"}
                    </td>
                    <td><StatusBadge status={e.status} /></td>
                    <td style={{ fontSize: 11, color: "var(--color-muted)" }}>
                      {e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          <DialogHeader>
            <DialogTitle className="font-display font-bold flex items-center gap-2" style={{ color: "var(--color-text)", fontSize: 20 }}>
              <Satellite size={18} style={{ color: "var(--color-green)" }} />
              BUILD ESTIMATE
            </DialogTitle>
          </DialogHeader>
          <EstimateBuilder onClose={() => setShowBuilder(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
