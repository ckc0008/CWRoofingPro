import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, CheckCircle, Clock, XCircle, DollarSign, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SupStatus = "draft" | "submitted" | "approved" | "rejected" | "partial";

const STATUS_BADGE: Record<SupStatus, { label: string; bg: string; color: string }> = {
  draft:     { label: "Draft",     bg: "rgba(148,163,184,0.15)", color: "#94a3b8" },
  submitted: { label: "Submitted", bg: "rgba(234,179,8,0.15)",   color: "#eab308" },
  approved:  { label: "Approved",  bg: "rgba(92,191,0,0.15)",    color: "#5CBF00" },
  rejected:  { label: "Rejected",  bg: "rgba(239,68,68,0.15)",   color: "#f87171" },
  partial:   { label: "Partial",   bg: "rgba(249,115,22,0.15)",  color: "#fb923c" },
};

const FILTER_TABS = ["All", "Draft", "Submitted", "Approved", "Rejected", "Partial"] as const;
const TAB_STATUS_MAP: Record<string, SupStatus | null> = {
  All: null, Draft: "draft", Submitted: "submitted", Approved: "approved", Rejected: "rejected", Partial: "partial",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const inputStyle = {
  background: "var(--color-surface)",
  borderColor: "var(--color-border)",
  color: "var(--color-text)",
};

interface LineItem {
  description: string;
  amount: string;
}

function SupplementForm({
  onClose,
  existing,
  autoNumber,
}: {
  onClose: () => void;
  existing?: any;
  autoNumber: string;
}) {
  const { toast } = useToast();

  const parseLineItems = (raw: any): LineItem[] => {
    if (!raw) return [];
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return []; }
    }
    if (Array.isArray(raw)) return raw.map((i: any) => ({ description: i.description || "", amount: String(i.amount || "") }));
    return [];
  };

  const [form, setForm] = useState({
    supplementNumber: existing?.supplementNumber || autoNumber,
    insuranceClaimId: existing?.insuranceClaimId ? String(existing.insuranceClaimId) : "",
    jobId: existing?.jobId ? String(existing.jobId) : "",
    status: (existing?.status as SupStatus) || "draft",
    requestedAmount: existing?.requestedAmount ? String(existing.requestedAmount) : "",
    approvedAmount: existing?.approvedAmount ? String(existing.approvedAmount) : "",
    submittedDate: existing?.submittedDate || "",
    approvedDate: existing?.approvedDate || "",
    notes: existing?.notes || "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>(parseLineItems(existing?.lineItems));

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const { data: claims = [] } = useQuery<any[]>({
    queryKey: ["/api/insurance-claims"],
    queryFn: () => apiRequest("GET", "/api/insurance-claims").then(r => r.json()),
  });

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
    queryFn: () => apiRequest("GET", "/api/jobs").then(r => r.json()),
  });

  function addLineItem() {
    setLineItems(items => [...items, { description: "", amount: "" }]);
  }

  function updateLineItem(idx: number, field: keyof LineItem, value: string) {
    setLineItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function removeLineItem(idx: number) {
    setLineItems(items => items.filter((_, i) => i !== idx));
  }

  const mutation = useMutation({
    mutationFn: (data: any) => existing
      ? apiRequest("PATCH", `/api/supplements/${existing.id}`, data).then(r => r.json())
      : apiRequest("POST", "/api/supplements", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplements"] });
      toast({ title: existing ? "Supplement updated" : "Supplement created" });
      onClose();
    },
    onError: () => toast({ title: "Error saving supplement", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/supplements/${existing?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplements"] });
      toast({ title: "Supplement deleted" });
      onClose();
    },
    onError: () => toast({ title: "Error deleting", variant: "destructive" }),
  });

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        const lineItemsJson = JSON.stringify(
          lineItems
            .filter(i => i.description.trim())
            .map(i => ({ description: i.description, amount: Number(i.amount) || 0 }))
        );
        mutation.mutate({
          ...form,
          insuranceClaimId: form.insuranceClaimId ? Number(form.insuranceClaimId) : null,
          jobId: form.jobId ? Number(form.jobId) : null,
          requestedAmount: form.requestedAmount ? Number(form.requestedAmount) : null,
          approvedAmount: form.approvedAmount ? Number(form.approvedAmount) : null,
          lineItems: lineItemsJson,
        });
      }}
      className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>SUPPLEMENT NUMBER</Label>
          <Input
            value={form.supplementNumber}
            onChange={e => set("supplementNumber", e.target.value)}
            className="mt-1"
            style={inputStyle}
          />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>STATUS</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger className="mt-1" style={inputStyle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {(Object.keys(STATUS_BADGE) as SupStatus[]).map(s => (
                <SelectItem key={s} value={s}>{STATUS_BADGE[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>INSURANCE CLAIM</Label>
          <Select value={form.insuranceClaimId} onValueChange={v => set("insuranceClaimId", v)}>
            <SelectTrigger className="mt-1" style={inputStyle}>
              <SelectValue placeholder="Select claim…" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {claims.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.carrier || "Unknown"} — {c.claimNumber || `#${c.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>JOB</Label>
          <Select value={form.jobId} onValueChange={v => set("jobId", v)}>
            <SelectTrigger className="mt-1" style={inputStyle}>
              <SelectValue placeholder="Select job…" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {jobs.map((j: any) => (
                <SelectItem key={j.id} value={String(j.id)}>
                  {j.jobNumber || `Job #${j.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>REQUESTED AMOUNT ($)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.requestedAmount}
            onChange={e => set("requestedAmount", e.target.value)}
            className="mt-1"
            style={inputStyle}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>APPROVED AMOUNT ($)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.approvedAmount}
            onChange={e => set("approvedAmount", e.target.value)}
            className="mt-1"
            style={inputStyle}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>SUBMITTED DATE</Label>
          <Input
            type="date"
            value={form.submittedDate}
            onChange={e => set("submittedDate", e.target.value)}
            className="mt-1"
            style={inputStyle}
          />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>APPROVED DATE</Label>
          <Input
            type="date"
            value={form.approvedDate}
            onChange={e => set("approvedDate", e.target.value)}
            className="mt-1"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>LINE ITEMS</Label>
          <button
            type="button"
            onClick={addLineItem}
            className="text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors"
            style={{ background: "var(--color-green-dim)", color: "var(--color-green)", border: "1px solid var(--color-green)" }}
          >
            <Plus size={12} /> Add Line Item
          </button>
        </div>
        <div className="space-y-2">
          {lineItems.length === 0 && (
            <p className="text-xs py-2" style={{ color: "var(--color-muted)" }}>No line items. Click "Add Line Item" to add one.</p>
          )}
          {lineItems.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                value={item.description}
                onChange={e => updateLineItem(idx, "description", e.target.value)}
                placeholder="Description…"
                className="flex-1"
                style={inputStyle}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.amount}
                onChange={e => updateLineItem(idx, "amount", e.target.value)}
                placeholder="$0.00"
                className="w-28"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => removeLineItem(idx)}
                className="p-1 rounded hover:opacity-80 flex-shrink-0"
                style={{ color: "#f87171" }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {lineItems.length > 0 && (
            <div className="flex justify-end pr-8 text-sm font-medium" style={{ color: "var(--color-muted)" }}>
              Total: <span className="ml-2" style={{ color: "var(--color-text)" }}>
                {fmt(lineItems.reduce((s, i) => s + (Number(i.amount) || 0), 0))}
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>NOTES</Label>
        <textarea
          value={form.notes}
          onChange={e => set("notes", e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm resize-none"
          style={{ ...inputStyle, outline: "none" }}
          placeholder="Additional notes…"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending} style={{ background: "var(--color-green)", color: "#000" }} className="flex-1">
          {mutation.isPending ? "Saving…" : existing ? "Update Supplement" : "Create Supplement"}
        </Button>
        {existing && (
          <Button type="button" variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            <Trash2 size={16} />
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose} style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function Supplements() {
  const [activeTab, setActiveTab] = useState("All");
  const [showDialog, setShowDialog] = useState(false);
  const [editSup, setEditSup] = useState<any>(null);

  const { data: supplements = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/supplements"],
    queryFn: () => apiRequest("GET", "/api/supplements").then(r => r.json()),
  });

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
    queryFn: () => apiRequest("GET", "/api/jobs").then(r => r.json()),
  });

  const { data: claims = [] } = useQuery<any[]>({
    queryKey: ["/api/insurance-claims"],
    queryFn: () => apiRequest("GET", "/api/insurance-claims").then(r => r.json()),
  });

  const jobsMap = Object.fromEntries(jobs.map((j: any) => [j.id, j]));
  const claimsMap = Object.fromEntries(claims.map((c: any) => [c.id, c]));

  const total = supplements.length;
  const submitted = supplements.filter((s: any) => s.status === "submitted").length;
  const approved = supplements.filter((s: any) => s.status === "approved").length;
  const approvedTotal = supplements
    .filter((s: any) => s.status === "approved" || s.status === "partial")
    .reduce((sum: number, s: any) => sum + Number(s.approvedAmount || 0), 0);
  const pendingTotal = supplements
    .filter((s: any) => s.status === "submitted" || s.status === "draft")
    .reduce((sum: number, s: any) => sum + Number(s.requestedAmount || 0), 0);

  const filtered = activeTab === "All"
    ? supplements
    : supplements.filter((s: any) => s.status === TAB_STATUS_MAP[activeTab]);

  const autoNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const n = supplements.length + 1;
    return `SUP-${year}-${String(n).padStart(3, "0")}`;
  }, [supplements]);

  const stats = [
    { label: "Total Supplements", value: String(total), icon: FileText, color: "#94a3b8" },
    { label: "Submitted", value: String(submitted), icon: Clock, color: "#eab308" },
    { label: "Approved", value: String(approved), icon: CheckCircle, color: "#5CBF00" },
    { label: "Total Approved $", value: fmt(approvedTotal), icon: DollarSign, color: "#5CBF00" },
    { label: "Pending $", value: fmt(pendingTotal), icon: DollarSign, color: "#fb923c" },
  ];

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Supplement Tracker</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>Manage insurance supplement requests</p>
        </div>
        <Button
          onClick={() => { setEditSup(null); setShowDialog(true); }}
          style={{ background: "var(--color-green)", color: "#000", fontWeight: 600 }}
        >
          <Plus size={16} className="mr-2" /> New Supplement
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl p-4 border" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} style={{ color: s.color }} />
              <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>{s.label}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              background: activeTab === tab ? "var(--color-green-dim)" : "transparent",
              color: activeTab === tab ? "var(--color-green)" : "var(--color-muted)",
              border: `1px solid ${activeTab === tab ? "var(--color-green)" : "var(--color-border)"}`,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
              {["Supplement #", "Claim / Job", "Status", "Requested", "Approved", "Submitted", "Approved Date", "Notes", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: "var(--color-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center" style={{ color: "var(--color-muted)" }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center" style={{ color: "var(--color-muted)" }}>No supplements found</td></tr>
            ) : filtered.map((s: any) => {
              const claim = s.insuranceClaimId ? claimsMap[s.insuranceClaimId] : null;
              const job = s.jobId ? jobsMap[s.jobId] : null;
              const claimLabel = claim ? `${claim.carrier || "?"} — ${claim.claimNumber || `#${claim.id}`}` : "—";
              const jobLabel = job ? (job.jobNumber || `Job #${job.id}`) : "—";
              const badge = STATUS_BADGE[s.status as SupStatus];
              return (
                <tr
                  key={s.id}
                  className="border-b cursor-pointer transition-colors"
                  style={{ borderColor: "var(--color-border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium">{s.supplementNumber || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs" style={{ color: "var(--color-muted)" }}>{claimLabel}</div>
                    <div className="text-xs font-medium">{jobLabel}</div>
                  </td>
                  <td className="px-4 py-3">
                    {badge && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{s.requestedAmount ? fmt(Number(s.requestedAmount)) : "—"}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "#5CBF00" }}>{s.approvedAmount ? fmt(Number(s.approvedAmount)) : "—"}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>
                    {s.submittedDate ? new Date(s.submittedDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>
                    {s.approvedDate ? new Date(s.approvedDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-xs" style={{ color: "var(--color-muted)" }}>{s.notes || "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setEditSup(s); setShowDialog(true); }}
                      className="p-1 rounded hover:opacity-80"
                      style={{ color: "var(--color-muted)" }}
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) { setShowDialog(false); setEditSup(null); } }}>
        <DialogContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)", maxWidth: 600 }}>
          <DialogHeader>
            <DialogTitle>{editSup ? "Edit Supplement" : "New Supplement"}</DialogTitle>
          </DialogHeader>
          <SupplementForm onClose={() => { setShowDialog(false); setEditSup(null); }} existing={editSup} autoNumber={autoNumber} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
