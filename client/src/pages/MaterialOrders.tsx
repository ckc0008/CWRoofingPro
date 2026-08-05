import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ClipboardList, Printer, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface MaterialLine {
  name: string;
  qty: number;
  unit: string;
  note?: string;
}

function calcMaterials(est: any): MaterialLine[] {
  const squares = Number(est.roofSquares) || 20;
  const lines: MaterialLine[] = [];

  // Shingles (1.15 waste factor, 3 bundles/square)
  const shingleSquares = Math.ceil(squares * 1.15);
  const shingleBundles = shingleSquares * 3;
  lines.push({ name: "Shingles", qty: shingleBundles, unit: "bundles", note: `${shingleSquares} sq (with 15% waste)` });

  // Underlayment (1 roll covers ~4 squares)
  const underlayRolls = Math.ceil(squares / 4);
  lines.push({ name: "Underlayment", qty: underlayRolls, unit: "rolls", note: "~4 sq/roll" });

  // Ridge Cap
  const ridgeBundles = Math.max(1, Math.ceil(squares / 10));
  lines.push({ name: "Ridge Cap Shingles", qty: ridgeBundles, unit: "bundles", note: "~1 bundle per 10 sq" });

  // Ice & Water Shield (10% of squares, sold in rolls)
  const iceWaterSq = Math.ceil(squares * 0.10);
  lines.push({ name: "Ice & Water Shield", qty: iceWaterSq, unit: "rolls", note: "Eave protection (~10% of area)" });

  // Nails (1 box per 10 squares)
  const nailBoxes = Math.ceil(squares / 10);
  lines.push({ name: "Roofing Nails (Coil)", qty: nailBoxes, unit: "boxes", note: "1 box per ~10 sq" });

  // Drip Edge (eave + rake, estimate 1.2× perimeter of a square roof)
  const dripEdgePieces = Math.ceil((squares * 10 * 1.2) / 10); // rough estimate
  lines.push({ name: "Drip Edge (10' sections)", qty: dripEdgePieces, unit: "pieces", note: "Eave + rake perimeter" });

  // Starter strip
  const starterRolls = Math.ceil(squares / 5);
  lines.push({ name: "Starter Strip", qty: starterRolls, unit: "rolls", note: "~5 sq/roll" });

  // Roofing Felt / Synthetic
  const feltRolls = Math.ceil(squares / 4);
  lines.push({ name: "Roofing Felt / Synthetic", qty: feltRolls, unit: "rolls", note: "Backup underlayment" });

  return lines;
}

export default function MaterialOrders() {
  const [selectedEstId, setSelectedEstId] = useState("");
  const [printNotes, setPrintNotes] = useState("");

  const { data: estimates = [], isLoading: loadingEst } = useQuery({
    queryKey: ["/api/estimates"],
    queryFn: () => apiRequest("GET", "/api/estimates").then(r => r.json()),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
    queryFn: () => apiRequest("GET", "/api/leads").then(r => r.json()),
  });

  const leadMap = Object.fromEntries(leads.map((l: any) => [l.id, l]));

  const selectedEst = estimates.find((e: any) => String(e.id) === selectedEstId);
  const selectedLead = selectedEst ? leadMap[selectedEst.leadId] : null;

  const materials = selectedEst ? calcMaterials(selectedEst) : [];

  // Sort estimates: newest first
  const sortedEstimates = [...estimates].sort((a: any, b: any) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white" style={{ fontSize: 26 }}>MATERIAL ORDERS</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Generate material order sheets from your estimates</p>
        </div>
      </div>

      {/* Estimate Selector */}
      <div className="section-panel p-5">
        <div className="font-display font-bold text-white mb-3" style={{ fontSize: 14 }}>SELECT ESTIMATE</div>
        {loadingEst ? (
          <div style={{ color: "var(--color-muted)", fontSize: 13 }}>Loading estimates...</div>
        ) : estimates.length === 0 ? (
          <div style={{ color: "var(--color-muted)", fontSize: 13 }}>No estimates found. Create an estimate first.</div>
        ) : (
          <div>
            <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>ESTIMATE</Label>
            <Select value={selectedEstId} onValueChange={setSelectedEstId}>
              <SelectTrigger
                className="mt-1 max-w-xl"
                style={{ background: "var(--color-surface-2, #1a2030)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
              >
                <SelectValue placeholder="Select an estimate to generate order sheet..." />
              </SelectTrigger>
              <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                {sortedEstimates.map((e: any) => {
                  const lead = leadMap[e.leadId];
                  const name = lead ? `${lead.firstName} ${lead.lastName}` : `Lead #${e.leadId}`;
                  return (
                    <SelectItem key={e.id} value={String(e.id)} style={{ color: "var(--color-text)" }}>
                      {e.estimateNumber} — {name} ({e.roofSquares} sq)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Material Order Sheet */}
      {selectedEst && (
        <div
          id="material-order-sheet"
          className="section-panel p-6 space-y-5"
        >
          {/* Order Sheet Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="font-display font-bold" style={{ fontSize: 22, color: "var(--color-green)" }}>
                MATERIAL ORDER SHEET
              </div>
              <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 2 }}>
                CW Roofing & Construction, LLC
              </div>
            </div>
            <Button
              onClick={() => window.print()}
              className="flex items-center gap-2 font-semibold print:hidden"
              style={{ background: "var(--color-green)", color: "#0a1500" }}
            >
              <Printer size={15} /> Print / Export
            </Button>
          </div>

          {/* Property + Estimate Info */}
          <div className="grid grid-cols-2 gap-5 py-4" style={{ borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 4 }}>PROPERTY ADDRESS</div>
              <div style={{ fontSize: 14, color: "var(--color-text)", fontWeight: 600 }}>
                {selectedLead?.address || "—"}
              </div>
              {selectedLead && (
                <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>
                  {selectedLead.firstName} {selectedLead.lastName}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--color-muted)" }}>Estimate #:</span>
                <span style={{ color: "var(--color-green)", fontWeight: 600 }}>{selectedEst.estimateNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--color-muted)" }}>Date:</span>
                <span style={{ color: "var(--color-text)" }}>
                  {selectedEst.createdAt ? new Date(selectedEst.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--color-muted)" }}>Status:</span>
                <span style={{ color: "var(--color-text)", textTransform: "capitalize" }}>{selectedEst.status || "draft"}</span>
              </div>
            </div>
          </div>

          {/* Measurements */}
          <div>
            <div className="font-display font-bold text-white mb-3" style={{ fontSize: 13 }}>ROOF MEASUREMENTS</div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "SQUARES", value: selectedEst.roofSquares || "—" },
                { label: "PITCH", value: selectedEst.roofPitch || "—" },
                { label: "TOTAL AREA (sq ft)", value: selectedEst.roofSquares ? `${(Number(selectedEst.roofSquares) * 100).toLocaleString()} sq ft` : "—" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="p-3 rounded-lg text-center"
                  style={{ background: "var(--color-green-dim)", border: "1px solid rgba(92,191,0,0.2)" }}
                >
                  <div className="font-bold" style={{ fontSize: 22, color: "var(--color-green)" }}>{value}</div>
                  <div style={{ fontSize: 10, color: "var(--color-muted)", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Materials List */}
          <div>
            <div className="font-display font-bold text-white mb-3" style={{ fontSize: 13 }}>MATERIALS LIST</div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "40%" }}>Material</th>
                    <th style={{ textAlign: "right" }}>Quantity</th>
                    <th>Unit</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: "var(--color-text)", fontSize: 13 }}>
                        <div className="flex items-center gap-2">
                          <Package size={13} style={{ color: "var(--color-green)", flexShrink: 0 }} />
                          {m.name}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--color-green)", fontSize: 16 }}>
                        {m.qty}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--color-muted)" }}>{m.unit}</td>
                      <td style={{ fontSize: 11, color: "var(--color-muted)" }}>{m.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Job Cost Reference */}
          {selectedEst.material && (
            <div
              className="p-4 rounded-lg"
              style={{ background: "rgba(92,191,0,0.06)", border: "1px solid rgba(92,191,0,0.2)" }}
            >
              <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
                Estimated Material Cost from Estimate:{" "}
                <span style={{ color: "var(--color-green)", fontWeight: 700, fontSize: 14 }}>
                  ${Number(selectedEst.material).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <div className="font-display font-bold text-white mb-2" style={{ fontSize: 13 }}>ORDER NOTES</div>
            <textarea
              value={printNotes}
              onChange={e => setPrintNotes(e.target.value)}
              rows={3}
              placeholder="Shingle color, brand preferences, delivery instructions..."
              className="w-full rounded-md px-3 py-2 text-sm resize-none"
              style={{ background: "var(--color-surface-2, #1a2030)", border: "1px solid var(--color-border)", color: "var(--color-text)", outline: "none" }}
            />
          </div>

          {/* Footer for print */}
          <div
            className="pt-4 flex justify-between items-end"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
              <div className="font-semibold" style={{ color: "var(--color-text)" }}>CW Roofing & Construction, LLC</div>
              <div>cwroofingservices.com</div>
            </div>
            <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
              Generated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* Recent Estimates Quick Access */}
      {!selectedEst && sortedEstimates.length > 0 && (
        <div className="section-panel p-5">
          <div className="font-display font-bold text-white mb-4" style={{ fontSize: 14 }}>RECENT ESTIMATES</div>
          <div className="space-y-2">
            {sortedEstimates.slice(0, 6).map((e: any) => {
              const lead = leadMap[e.leadId];
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedEstId(String(e.id))}
                  className="w-full flex items-center justify-between p-3 rounded-lg transition-all text-left"
                  style={{
                    background: "var(--color-surface-2, #1a2030)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                      {e.estimateNumber}
                      {lead && <span style={{ color: "var(--color-muted)", fontWeight: 400 }}> — {lead.firstName} {lead.lastName}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 1 }}>
                      {e.roofSquares} squares · {e.roofType?.replace(/-/g, " ")} · ${Number(e.totalAmount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-green)" }}>
                    Generate →
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No estimates state */}
      {!loadingEst && estimates.length === 0 && (
        <div className="section-panel p-12 text-center">
          <ClipboardList size={48} style={{ color: "var(--color-muted)", margin: "0 auto 16px" }} />
          <div style={{ color: "var(--color-text)", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            No estimates yet
          </div>
          <div style={{ color: "var(--color-muted)", fontSize: 13 }}>
            Create an estimate first, then generate a material order sheet here.
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #material-order-sheet, #material-order-sheet * { visibility: visible; }
          #material-order-sheet { 
            position: absolute; left: 0; top: 0; width: 100%;
            background: white !important; color: black !important;
            padding: 24px;
          }
          #material-order-sheet * {
            color: black !important;
            background: transparent !important;
            border-color: #ccc !important;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
