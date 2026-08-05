import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Plus, FileSignature, Send, CheckCircle2, XCircle, FileText, Pen, Type, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CONTRACT_TEMPLATE = `ROOFING CONTRACT

CW Roofing & Construction, LLC
Website: cwroofingservices.com

This agreement is made between CW Roofing & Construction, LLC ("Contractor") and the homeowner named below ("Homeowner").

SCOPE OF WORK:
The Contractor agrees to perform roofing work at the property specified, including materials and labor as detailed in the associated estimate.

PAYMENT TERMS:
A deposit of 40% is due upon signing. The remaining balance is due upon completion of work.

WARRANTY:
Contractor provides a workmanship warranty. Material warranties are provided by the manufacturer.

By signing below, Homeowner agrees to the terms of this contract.`;

function contractStatusBadge(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    draft:  { label: "Draft",  color: "#8a9099", bg: "rgba(138,144,153,0.12)" },
    sent:   { label: "Sent",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    signed: { label: "Signed", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    void:   { label: "Void",   color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  };
  const s = map[status] || { label: status, color: "#8a9099", bg: "rgba(138,144,153,0.12)" };
  return (
    <span className="cw-badge flex-shrink-0" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function autoContractNumber(contracts: any[]) {
  const year = new Date().getFullYear();
  const seq = (contracts.length + 1).toString().padStart(3, "0");
  return `CON-${year}-${seq}`;
}

const EMPTY_NEW_FORM = {
  contractNumber: "",
  leadId: "",
  estimateId: "",
  homeownerName: "",
  totalAmount: "",
  notes: "",
};

// ─── Signature Canvas Component ───────────────────────────────────────────────

function SignatureCanvas({ onSignature }: { onSignature: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signTab, setSignTab] = useState<"draw" | "type">("draw");
  const [typedSig, setTypedSig] = useState("");
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawn(true);
    lastPos.current = getPos(e, canvas);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  }

  function endDraw() {
    setIsDrawing(false);
    lastPos.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function handleSign() {
    if (signTab === "draw") {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      onSignature(canvas.toDataURL("image/png"));
    } else {
      if (!typedSig.trim()) return;
      // Render typed sig to canvas
      const offscreen = document.createElement("canvas");
      offscreen.width = 400;
      offscreen.height = 150;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "transparent";
      ctx.clearRect(0, 0, 400, 150);
      ctx.font = "italic 42px Georgia, serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.textBaseline = "middle";
      ctx.fillText(typedSig, 20, 75);
      onSignature(offscreen.toDataURL("image/png"));
    }
  }

  const canSign = signTab === "draw" ? hasDrawn : typedSig.trim().length > 0;

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex" style={{ borderBottom: "1px solid var(--color-border)" }}>
        {(["draw", "type"] as const).map(tab => (
          <button key={tab} onClick={() => setSignTab(tab)}
            className="px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors"
            style={{
              color: signTab === tab ? "var(--color-green)" : "var(--color-muted)",
              borderBottom: signTab === tab ? "2px solid var(--color-green)" : "2px solid transparent",
              background: "transparent",
              marginBottom: -1,
            }}>
            {tab === "draw" ? <Pen size={13} /> : <Type size={13} />}
            {tab === "draw" ? "Draw" : "Type"}
          </button>
        ))}
      </div>

      {signTab === "draw" ? (
        <div>
          <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 6 }}>
            Draw your signature below
          </div>
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              cursor: "crosshair",
              display: "block",
              width: "100%",
              maxWidth: 400,
              touchAction: "none",
            }}
          />
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 6 }}>
            Type your full name — it will appear as a cursive signature
          </div>
          <Input
            value={typedSig}
            onChange={e => setTypedSig(e.target.value)}
            placeholder="Full name..."
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
          {typedSig && (
            <div style={{
              marginTop: 12,
              padding: "12px 20px",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              fontSize: 36,
              color: "var(--color-text)",
            }}>
              {typedSig}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {signTab === "draw" && (
          <Button variant="outline" onClick={clearCanvas} className="flex items-center gap-1.5"
            style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent", fontSize: 12 }}>
            <Trash2 size={12} /> Clear
          </Button>
        )}
        <Button onClick={handleSign} disabled={!canSign} className="flex-1 font-semibold flex items-center gap-2"
          style={{ background: canSign ? "var(--color-green)" : "var(--color-border)", color: canSign ? "#0a1500" : "var(--color-muted)" }}>
          <CheckCircle2 size={14} /> Sign Contract
        </Button>
      </div>
    </div>
  );
}

// ─── Contract Detail Dialog ──────────────────────────────────────────────────

function ContractDetailDialog({
  contract,
  leads,
  estimates,
  onClose,
}: {
  contract: any;
  leads: any[];
  estimates: any[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [body, setBody] = useState(contract.contractBody || "");
  const [homeownerName, setHomeownerName] = useState(contract.homeownerName || "");
  const [totalAmount, setTotalAmount] = useState(contract.totalAmount != null ? String(contract.totalAmount) : "");
  const [notes, setNotes] = useState(contract.notes || "");
  const [signatureData, setSignatureData] = useState<string | null>(contract.signatureData || null);
  const [showSignature, setShowSignature] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PATCH", `/api/contracts/${contract.id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/contracts/${contract.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract deleted" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function handleSave() {
    updateMutation.mutate({
      contractBody: body,
      homeownerName,
      totalAmount: totalAmount ? Number(totalAmount) : null,
      notes,
    });
  }

  function handleMarkSent() {
    updateMutation.mutate({ status: "sent", sentDate: new Date().toISOString() });
  }

  function handleSign(dataUrl: string) {
    setSignatureData(dataUrl);
    updateMutation.mutate({ signatureData: dataUrl, status: "signed", signedDate: new Date().toISOString() });
    setShowSignature(false);
    toast({ title: "Contract signed!", description: "Signature saved successfully." });
  }

  const lead = leads.find((l: any) => l.id === contract.leadId);

  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>CONTRACT #</Label>
          <div style={{ color: "var(--color-green)", fontFamily: "monospace", fontWeight: 600, marginTop: 4 }}>
            {contract.contractNumber}
          </div>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>STATUS</Label>
          <div style={{ marginTop: 4 }}>{contractStatusBadge(contract.status)}</div>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>LEAD</Label>
          <div style={{ marginTop: 4 }}>
            {lead ? (
              <Link href={`/crm/${lead.id}`}>
                <a onClick={e => e.stopPropagation()} style={{ color: "var(--color-green)", fontSize: 13 }}>
                  {lead.firstName} {lead.lastName}
                </a>
              </Link>
            ) : <span style={{ color: "var(--color-muted)", fontSize: 12 }}>—</span>}
          </div>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>TOTAL AMOUNT ($)</Label>
          <Input value={totalAmount} onChange={e => setTotalAmount(e.target.value)} type="number"
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div className="col-span-2">
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>HOMEOWNER NAME</Label>
          <Input value={homeownerName} onChange={e => setHomeownerName(e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div className="col-span-2">
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>NOTES</Label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full mt-1 rounded-md px-3 py-2 text-sm resize-none"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)", outline: "none" }} />
        </div>
      </div>

      {/* Contract Body */}
      <div style={{ background: "rgba(92,191,0,0.04)", border: "1px solid rgba(92,191,0,0.15)", borderRadius: 8, padding: 16 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-display font-bold text-white" style={{ fontSize: 13 }}>CONTRACT BODY</div>
          <Button variant="outline" onClick={() => setBody(CONTRACT_TEMPLATE)}
            className="flex items-center gap-1.5"
            style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent", fontSize: 11 }}>
            <FileText size={11} /> Use Template
          </Button>
        </div>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={12}
          className="w-full rounded-md px-3 py-2 text-sm resize-y font-mono"
          placeholder="Enter contract text or click 'Use Template'..."
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)", outline: "none", lineHeight: 1.6 }} />
      </div>

      {/* E-Signature Section */}
      <div style={{ background: "rgba(14,165,233,0.04)", border: "1px solid rgba(14,165,233,0.15)", borderRadius: 8, padding: 16 }}>
        <div className="font-display font-bold text-white mb-3" style={{ fontSize: 13 }}>E-SIGNATURE</div>
        {signatureData ? (
          <div className="space-y-3">
            <div style={{ fontSize: 12, color: "#22c55e" }}>✓ Contract signed</div>
            <img src={signatureData} alt="Signature"
              style={{ border: "1px solid var(--color-border)", borderRadius: 6, maxWidth: 400, background: "rgba(255,255,255,0.04)" }} />
            <Button variant="outline" onClick={() => setShowSignature(true)}
              style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent", fontSize: 12 }}>
              Re-sign
            </Button>
          </div>
        ) : (
          <div>
            {showSignature ? (
              <SignatureCanvas onSignature={handleSign} />
            ) : (
              <Button onClick={() => setShowSignature(true)} className="flex items-center gap-2"
                style={{ background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.3)", color: "#0ea5e9" }}>
                <Pen size={14} /> Add Signature
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 flex-wrap">
        <Button variant="outline" onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="flex items-center gap-1.5"
          style={{ borderColor: "#ef4444", color: "#ef4444", background: "transparent" }}>
          <Trash2 size={13} /> Delete
        </Button>
        {contract.status === "draft" && (
          <Button variant="outline" onClick={handleMarkSent}
            disabled={updateMutation.isPending}
            className="flex items-center gap-1.5"
            style={{ borderColor: "#f59e0b", color: "#f59e0b", background: "transparent" }}>
            <Send size={13} /> Mark as Sent
          </Button>
        )}
        <Button variant="outline" onClick={onClose}
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent" }}>
          Cancel
        </Button>
        <Button onClick={handleSave} className="flex-1 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}
          disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── New Contract Form ────────────────────────────────────────────────────────

function NewContractForm({
  contracts,
  leads,
  estimates,
  onClose,
}: {
  contracts: any[];
  leads: any[];
  estimates: any[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    contractNumber: autoContractNumber(contracts),
    leadId: "",
    estimateId: "",
    homeownerName: "",
    totalAmount: "",
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/contracts", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract created" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  function handleCreate() {
    createMutation.mutate({
      ...form,
      leadId: form.leadId ? Number(form.leadId) : null,
      estimateId: form.estimateId ? Number(form.estimateId) : null,
      totalAmount: form.totalAmount ? Number(form.totalAmount) : null,
      status: "draft",
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>CONTRACT NUMBER</Label>
          <Input value={form.contractNumber} onChange={e => set("contractNumber", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>TOTAL AMOUNT ($)</Label>
          <Input type="number" value={form.totalAmount} onChange={e => set("totalAmount", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div className="col-span-2">
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>LEAD</Label>
          <Select value={form.leadId} onValueChange={v => set("leadId", v)}>
            <SelectTrigger className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
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
        <div className="col-span-2">
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>ESTIMATE (optional)</Label>
          <Select value={form.estimateId} onValueChange={v => set("estimateId", v)}>
            <SelectTrigger className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue placeholder="Link to estimate..." />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {estimates.map((e: any) => (
                <SelectItem key={e.id} value={String(e.id)} style={{ color: "var(--color-text)" }}>
                  {e.estimateNumber || `EST-${e.id}`} — ${Number(e.totalAmount || 0).toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>HOMEOWNER NAME</Label>
          <Input value={form.homeownerName} onChange={e => set("homeownerName", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div className="col-span-2">
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>NOTES</Label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3}
            className="w-full mt-1 rounded-md px-3 py-2 text-sm resize-none"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)", outline: "none" }} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1"
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent" }}>
          Cancel
        </Button>
        <Button onClick={handleCreate} className="flex-1 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}
          disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : "Create Contract"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Contracts() {
  const [showNew, setShowNew] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["/api/contracts"],
    queryFn: () => apiRequest("GET", "/api/contracts").then(r => r.json()),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
    queryFn: () => apiRequest("GET", "/api/leads").then(r => r.json()),
  });

  const { data: estimates = [] } = useQuery({
    queryKey: ["/api/estimates"],
    queryFn: () => apiRequest("GET", "/api/estimates").then(r => r.json()),
  });

  const leadMap = Object.fromEntries(leads.map((l: any) => [l.id, l]));

  const stats = {
    total: contracts.length,
    draft: contracts.filter((c: any) => c.status === "draft").length,
    sent: contracts.filter((c: any) => c.status === "sent").length,
    signed: contracts.filter((c: any) => c.status === "signed").length,
    void: contracts.filter((c: any) => c.status === "void").length,
  };

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white" style={{ fontSize: 26 }}>CONTRACTS</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Digital contracts with e-signature</p>
        </div>
        <Button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}>
          <Plus size={15} /> New Contract
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total", value: stats.total, icon: FileSignature, color: "#5cbf00" },
          { label: "Draft", value: stats.draft, icon: FileText, color: "#8a9099" },
          { label: "Sent", value: stats.sent, icon: Send, color: "#f59e0b" },
          { label: "Signed", value: stats.signed, icon: CheckCircle2, color: "#22c55e" },
          { label: "Void", value: stats.void, icon: XCircle, color: "#ef4444" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}22`, color }}>
                <Icon size={18} />
              </div>
            </div>
            <div className="font-display font-bold" style={{ fontSize: 26, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Contracts List */}
      <div className="section-panel overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Loading...</div>
        ) : contracts.length === 0 ? (
          <div className="p-12 text-center">
            <FileSignature size={40} style={{ color: "var(--color-muted)", margin: "0 auto 12px" }} />
            <div style={{ color: "var(--color-text)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No contracts yet</div>
            <div style={{ color: "var(--color-muted)", fontSize: 13 }}>Click "New Contract" to create your first digital contract</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contract #</th>
                  <th>Homeowner</th>
                  <th>Lead</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th>Sent Date</th>
                  <th>Signed Date</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract: any) => {
                  const lead = leadMap[contract.leadId];
                  return (
                    <tr key={contract.id} onClick={() => setSelectedContract(contract)}
                      className="cursor-pointer hover:bg-white/5 transition-colors">
                      <td style={{ color: "var(--color-green)", fontSize: 13, fontFamily: "monospace", fontWeight: 600 }}>
                        {contract.contractNumber}
                      </td>
                      <td style={{ fontSize: 13, color: "var(--color-text)" }}>
                        {contract.homeownerName || "—"}
                      </td>
                      <td>
                        {lead ? (
                          <Link href={`/crm/${lead.id}`}>
                            <a onClick={e => e.stopPropagation()} style={{ color: "var(--color-green)", fontSize: 13 }}>
                              {lead.firstName} {lead.lastName}
                            </a>
                          </Link>
                        ) : (
                          <span style={{ color: "var(--color-muted)", fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>{contractStatusBadge(contract.status)}</td>
                      <td style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                        {contract.totalAmount != null ? `$${Number(contract.totalAmount).toLocaleString()}` : "—"}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--color-muted)" }}>
                        {contract.sentDate ? new Date(contract.sentDate).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--color-muted)" }}>
                        {contract.signedDate ? new Date(contract.signedDate).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Contract Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          <DialogHeader>
            <DialogTitle className="font-display font-bold" style={{ color: "var(--color-text)", fontSize: 20 }}>
              NEW CONTRACT
            </DialogTitle>
          </DialogHeader>
          <NewContractForm
            contracts={contracts}
            leads={leads}
            estimates={estimates}
            onClose={() => setShowNew(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Contract Detail Dialog */}
      <Dialog open={!!selectedContract} onOpenChange={v => { if (!v) setSelectedContract(null); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          <DialogHeader>
            <DialogTitle className="font-display font-bold" style={{ color: "var(--color-text)", fontSize: 20 }}>
              CONTRACT — {selectedContract?.contractNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <ContractDetailDialog
              contract={selectedContract}
              leads={leads}
              estimates={estimates}
              onClose={() => setSelectedContract(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
