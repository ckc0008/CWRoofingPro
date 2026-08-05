import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Plus, ShieldCheck, DollarSign, Clock, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CLAIM_STATUSES = ["filed", "pending", "approved", "supplemented", "closed", "denied"] as const;
const ENDORSEMENT_STATUSES = ["pending", "received", "endorsed", "deposited"] as const;

function claimStatusBadge(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    filed:       { label: "Filed",       color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    pending:     { label: "Pending",     color: "#f97316", bg: "rgba(249,115,22,0.12)" },
    approved:    { label: "Approved",    color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    supplemented:{ label: "Supplemented",color: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
    closed:      { label: "Closed",      color: "#8a9099", bg: "rgba(138,144,153,0.12)" },
    denied:      { label: "Denied",      color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  };
  const s = map[status] || { label: status, color: "#8a9099", bg: "rgba(138,144,153,0.12)" };
  return (
    <span className="cw-badge flex-shrink-0" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function endorsementBadge(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: "Pending",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    received:  { label: "Received",  color: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
    endorsed:  { label: "Endorsed",  color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
    deposited: { label: "Deposited", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  };
  const s = map[status] || { label: status || "—", color: "#8a9099", bg: "rgba(138,144,153,0.12)" };
  return (
    <span className="cw-badge flex-shrink-0" style={{ color: s.color, background: s.bg, fontSize: 10 }}>
      {s.label}
    </span>
  );
}

const EMPTY_FORM = {
  carrier: "",
  leadId: "",
  policyNumber: "",
  claimNumber: "",
  status: "filed",
  adjusterName: "",
  adjusterPhone: "",
  adjusterEmail: "",
  dateFiled: "",
  dateInspection: "",
  dateApproved: "",
  initialAmount: "",
  approvedAmount: "",
  mortgageCompany: "",
  checkEndorsementStatus: "pending",
  notes: "",
};

function ClaimForm({
  form,
  setForm,
  leads,
  onSubmit,
  onDelete,
  onClose,
  isPending,
  isEdit,
}: {
  form: typeof EMPTY_FORM;
  setForm: (f: typeof EMPTY_FORM) => void;
  leads: any[];
  onSubmit: () => void;
  onDelete?: () => void;
  onClose: () => void;
  isPending: boolean;
  isEdit: boolean;
}) {
  const set = (k: keyof typeof EMPTY_FORM, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>CARRIER *</Label>
          <Input value={form.carrier} onChange={e => set("carrier", e.target.value)} placeholder="State Farm, Allstate..."
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div className="col-span-2">
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>LEAD *</Label>
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
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>POLICY #</Label>
          <Input value={form.policyNumber} onChange={e => set("policyNumber", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>CLAIM #</Label>
          <Input value={form.claimNumber} onChange={e => set("claimNumber", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>STATUS</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {CLAIM_STATUSES.map(s => (
                <SelectItem key={s} value={s} style={{ color: "var(--color-text)" }}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>ADJUSTER NAME</Label>
          <Input value={form.adjusterName} onChange={e => set("adjusterName", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>ADJUSTER PHONE</Label>
          <Input value={form.adjusterPhone} onChange={e => set("adjusterPhone", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>ADJUSTER EMAIL</Label>
          <Input value={form.adjusterEmail} onChange={e => set("adjusterEmail", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>DATE FILED</Label>
          <Input type="date" value={form.dateFiled} onChange={e => set("dateFiled", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>DATE INSPECTION</Label>
          <Input type="date" value={form.dateInspection} onChange={e => set("dateInspection", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>DATE APPROVED</Label>
          <Input type="date" value={form.dateApproved} onChange={e => set("dateApproved", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>INITIAL AMOUNT ($)</Label>
          <Input type="number" value={form.initialAmount} onChange={e => set("initialAmount", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>APPROVED AMOUNT ($)</Label>
          <Input type="number" value={form.approvedAmount} onChange={e => set("approvedAmount", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>MORTGAGE COMPANY</Label>
          <Input value={form.mortgageCompany} onChange={e => set("mortgageCompany", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>CHECK ENDORSEMENT STATUS</Label>
          <Select value={form.checkEndorsementStatus} onValueChange={v => set("checkEndorsementStatus", v)}>
            <SelectTrigger className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {ENDORSEMENT_STATUSES.map(s => (
                <SelectItem key={s} value={s} style={{ color: "var(--color-text)" }}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>NOTES</Label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3}
            className="w-full mt-1 rounded-md px-3 py-2 text-sm resize-none"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)", outline: "none" }} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        {isEdit && onDelete && (
          <Button variant="outline" onClick={onDelete}
            style={{ borderColor: "#ef4444", color: "#ef4444", background: "transparent" }}>
            Delete
          </Button>
        )}
        <Button variant="outline" onClick={onClose} className="flex-1"
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent" }}>
          Cancel
        </Button>
        <Button onClick={onSubmit} className="flex-1 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}
          disabled={isPending}>
          {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Claim"}
        </Button>
      </div>
    </div>
  );
}

const FILTER_TABS = ["All", "Filed", "Pending", "Approved", "Supplemented", "Closed"] as const;

export default function InsuranceClaims() {
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [editClaim, setEditClaim] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["/api/insurance-claims"],
    queryFn: () => apiRequest("GET", "/api/insurance-claims").then(r => r.json()),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
    queryFn: () => apiRequest("GET", "/api/leads").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/insurance-claims", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance-claims"] });
      toast({ title: "Claim created" });
      setShowNew(false);
      setForm({ ...EMPTY_FORM });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/insurance-claims/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance-claims"] });
      toast({ title: "Claim updated" });
      setEditClaim(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/insurance-claims/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance-claims"] });
      toast({ title: "Claim deleted" });
      setEditClaim(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openEdit(claim: any) {
    setForm({
      carrier: claim.carrier || "",
      leadId: String(claim.leadId || ""),
      policyNumber: claim.policyNumber || "",
      claimNumber: claim.claimNumber || "",
      status: claim.status || "filed",
      adjusterName: claim.adjusterName || "",
      adjusterPhone: claim.adjusterPhone || "",
      adjusterEmail: claim.adjusterEmail || "",
      dateFiled: claim.dateFiled ? claim.dateFiled.split("T")[0] : "",
      dateInspection: claim.dateInspection ? claim.dateInspection.split("T")[0] : "",
      dateApproved: claim.dateApproved ? claim.dateApproved.split("T")[0] : "",
      initialAmount: claim.initialAmount != null ? String(claim.initialAmount) : "",
      approvedAmount: claim.approvedAmount != null ? String(claim.approvedAmount) : "",
      mortgageCompany: claim.mortgageCompany || "",
      checkEndorsementStatus: claim.checkEndorsementStatus || "pending",
      notes: claim.notes || "",
    });
    setEditClaim(claim);
  }

  function handleCreate() {
    if (!form.carrier) { toast({ title: "Carrier is required", variant: "destructive" }); return; }
    if (!form.leadId) { toast({ title: "Lead is required", variant: "destructive" }); return; }
    createMutation.mutate({
      ...form,
      leadId: Number(form.leadId),
      initialAmount: form.initialAmount ? Number(form.initialAmount) : null,
      approvedAmount: form.approvedAmount ? Number(form.approvedAmount) : null,
    });
  }

  function handleUpdate() {
    if (!editClaim) return;
    updateMutation.mutate({
      id: editClaim.id,
      data: {
        ...form,
        leadId: Number(form.leadId),
        initialAmount: form.initialAmount ? Number(form.initialAmount) : null,
        approvedAmount: form.approvedAmount ? Number(form.approvedAmount) : null,
      },
    });
  }

  const leadMap = Object.fromEntries(leads.map((l: any) => [l.id, l]));
  const filtered = activeTab === "All"
    ? claims
    : claims.filter((c: any) => c.status === activeTab.toLowerCase());

  const totalApproved = claims
    .filter((c: any) => c.status === "approved")
    .reduce((s: number, c: any) => s + (c.approvedAmount || 0), 0);
  const openActive = claims.filter((c: any) => ["filed", "pending", "supplemented"].includes(c.status)).length;
  const pendingEndorsement = claims.filter((c: any) => c.checkEndorsementStatus === "pending" && c.status === "approved").length;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white" style={{ fontSize: 26 }}>INSURANCE CLAIMS</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Track and manage all insurance claims</p>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY_FORM }); setShowNew(true); }}
          className="flex items-center gap-2 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}>
          <Plus size={15} /> New Claim
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Claims", value: claims.length, icon: ShieldCheck, color: "#5cbf00" },
          { label: "Open / Active", value: openActive, icon: Clock, color: "#f59e0b" },
          { label: "Total Approved $", value: `$${(totalApproved / 1000).toFixed(1)}K`, icon: DollarSign, color: "#22c55e" },
          { label: "Pending Endorsement", value: pendingEndorsement, icon: FileCheck, color: "#0ea5e9" },
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

      {/* Filter Tabs */}
      <div className="flex gap-1 flex-wrap" style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: 0 }}>
        {FILTER_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab ? "var(--color-green)" : "var(--color-muted)",
              borderBottom: activeTab === tab ? "2px solid var(--color-green)" : "2px solid transparent",
              background: "transparent",
              marginBottom: -1,
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Claims Table */}
      <div className="section-panel overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck size={40} style={{ color: "var(--color-muted)", margin: "0 auto 12px" }} />
            <div style={{ color: "var(--color-text)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No claims found</div>
            <div style={{ color: "var(--color-muted)", fontSize: 13 }}>Click "New Claim" to add an insurance claim</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Carrier</th>
                  <th>Claim #</th>
                  <th>Policy #</th>
                  <th>Lead</th>
                  <th>Status</th>
                  <th>Approved $</th>
                  <th>Endorsement</th>
                  <th>Filed Date</th>
                  <th>Adjuster</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((claim: any) => {
                  const lead = leadMap[claim.leadId];
                  return (
                    <tr key={claim.id} onClick={() => openEdit(claim)}
                      className="cursor-pointer hover:bg-white/5 transition-colors">
                      <td style={{ fontWeight: 600, color: "var(--color-text)" }}>{claim.carrier || "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--color-green)", fontFamily: "monospace" }}>{claim.claimNumber || "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--color-muted)", fontFamily: "monospace" }}>{claim.policyNumber || "—"}</td>
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
                      <td>{claimStatusBadge(claim.status)}</td>
                      <td style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                        {claim.approvedAmount != null ? `$${Number(claim.approvedAmount).toLocaleString()}` : "—"}
                      </td>
                      <td>{endorsementBadge(claim.checkEndorsementStatus)}</td>
                      <td style={{ fontSize: 11, color: "var(--color-muted)" }}>
                        {claim.dateFiled ? new Date(claim.dateFiled).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--color-text)" }}>{claim.adjusterName || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Claim Dialog */}
      <Dialog open={showNew} onOpenChange={v => { setShowNew(v); if (!v) setForm({ ...EMPTY_FORM }); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          <DialogHeader>
            <DialogTitle className="font-display font-bold" style={{ color: "var(--color-text)", fontSize: 20 }}>
              NEW INSURANCE CLAIM
            </DialogTitle>
          </DialogHeader>
          <ClaimForm
            form={form} setForm={setForm} leads={leads}
            onSubmit={handleCreate} onClose={() => setShowNew(false)}
            isPending={createMutation.isPending} isEdit={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Claim Dialog */}
      <Dialog open={!!editClaim} onOpenChange={v => { if (!v) setEditClaim(null); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          <DialogHeader>
            <DialogTitle className="font-display font-bold" style={{ color: "var(--color-text)", fontSize: 20 }}>
              EDIT CLAIM — {editClaim?.claimNumber || editClaim?.carrier || ""}
            </DialogTitle>
          </DialogHeader>
          <ClaimForm
            form={form} setForm={setForm} leads={leads}
            onSubmit={handleUpdate}
            onDelete={() => editClaim && deleteMutation.mutate(editClaim.id)}
            onClose={() => setEditClaim(null)}
            isPending={updateMutation.isPending || deleteMutation.isPending}
            isEdit={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
