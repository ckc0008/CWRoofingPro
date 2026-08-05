import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, TrendingUp, CreditCard, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAYMENT_TYPES = ["deposit", "progress", "final", "supplement", "refund"] as const;
const PAYMENT_METHODS = ["check", "cash", "card", "zelle", "venmo", "ach"] as const;
type PaymentType = typeof PAYMENT_TYPES[number];
type PaymentMethod = typeof PAYMENT_METHODS[number];

const TYPE_BADGE: Record<PaymentType, { label: string; bg: string; color: string }> = {
  deposit:    { label: "Deposit",    bg: "rgba(59,130,246,0.15)",  color: "#60a5fa" },
  progress:   { label: "Progress",   bg: "rgba(249,115,22,0.15)",  color: "#fb923c" },
  final:      { label: "Final",      bg: "rgba(92,191,0,0.15)",    color: "#5CBF00" },
  supplement: { label: "Supplement", bg: "rgba(168,85,247,0.15)",  color: "#c084fc" },
  refund:     { label: "Refund",     bg: "rgba(239,68,68,0.15)",   color: "#f87171" },
};

const METHOD_BADGE: Record<PaymentMethod, { label: string; bg: string; color: string }> = {
  check:  { label: "Check",  bg: "rgba(148,163,184,0.15)", color: "#94a3b8" },
  cash:   { label: "Cash",   bg: "rgba(234,179,8,0.15)",   color: "#eab308" },
  card:   { label: "Card",   bg: "rgba(59,130,246,0.15)",  color: "#60a5fa" },
  zelle:  { label: "Zelle",  bg: "rgba(6,182,212,0.15)",   color: "#22d3ee" },
  venmo:  { label: "Venmo",  bg: "rgba(30,64,175,0.2)",    color: "#818cf8" },
  ach:    { label: "ACH",    bg: "rgba(148,163,184,0.15)", color: "#94a3b8" },
};

const FILTER_TABS = ["All", "Deposits", "Progress", "Final", "Supplements", "Refunds"] as const;
const TAB_TYPE_MAP: Record<string, PaymentType | null> = {
  All: null, Deposits: "deposit", Progress: "progress", Final: "final", Supplements: "supplement", Refunds: "refund",
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

function PaymentForm({ onClose, existing }: { onClose: () => void; existing?: any }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    leadId: existing?.leadId ? String(existing.leadId) : "",
    jobId: existing?.jobId ? String(existing.jobId) : "",
    type: (existing?.type as PaymentType) || "deposit",
    amount: existing?.amount ? String(existing.amount) : "",
    method: (existing?.method as PaymentMethod) || "check",
    referenceNumber: existing?.referenceNumber || "",
    datePaid: existing?.datePaid || today(),
    notes: existing?.notes || "",
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ["/api/leads"],
    queryFn: () => apiRequest("GET", "/api/leads").then(r => r.json()),
  });

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
    queryFn: () => apiRequest("GET", "/api/jobs").then(r => r.json()),
  });

  const filteredJobs = form.leadId
    ? jobs.filter((j: any) => String(j.leadId) === form.leadId)
    : jobs;

  const mutation = useMutation({
    mutationFn: (data: any) => existing
      ? apiRequest("PATCH", `/api/payments/${existing.id}`, data).then(r => r.json())
      : apiRequest("POST", "/api/payments", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({ title: existing ? "Payment updated" : "Payment recorded" });
      onClose();
    },
    onError: () => toast({ title: "Error saving payment", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/payments/${existing?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({ title: "Payment deleted" });
      onClose();
    },
    onError: () => toast({ title: "Error deleting", variant: "destructive" }),
  });

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        mutation.mutate({ ...form, leadId: form.leadId ? Number(form.leadId) : null, jobId: form.jobId ? Number(form.jobId) : null, amount: Number(form.amount) });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>LEAD</Label>
          <Select value={form.leadId} onValueChange={v => { set("leadId", v); set("jobId", ""); }}>
            <SelectTrigger className="mt-1" style={inputStyle}>
              <SelectValue placeholder="Select lead…" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {leads.map((l: any) => (
                <SelectItem key={l.id} value={String(l.id)}>{l.firstName} {l.lastName}</SelectItem>
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
              {filteredJobs.map((j: any) => (
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
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>PAYMENT TYPE *</Label>
          <Select value={form.type} onValueChange={v => set("type", v)}>
            <SelectTrigger className="mt-1" style={inputStyle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {PAYMENT_TYPES.map(t => (
                <SelectItem key={t} value={t}>{TYPE_BADGE[t].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>AMOUNT * ($)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            required
            value={form.amount}
            onChange={e => set("amount", e.target.value)}
            className="mt-1"
            style={inputStyle}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>METHOD</Label>
          <Select value={form.method} onValueChange={v => set("method", v)}>
            <SelectTrigger className="mt-1" style={inputStyle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {PAYMENT_METHODS.map(m => (
                <SelectItem key={m} value={m}>{METHOD_BADGE[m].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>REFERENCE #</Label>
          <Input
            value={form.referenceNumber}
            onChange={e => set("referenceNumber", e.target.value)}
            className="mt-1"
            style={inputStyle}
            placeholder="Check #, transaction ID…"
          />
        </div>
      </div>

      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>DATE PAID</Label>
        <Input
          type="date"
          value={form.datePaid}
          onChange={e => set("datePaid", e.target.value)}
          className="mt-1"
          style={inputStyle}
        />
      </div>

      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>NOTES</Label>
        <textarea
          value={form.notes}
          onChange={e => set("notes", e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm resize-none"
          style={{ ...inputStyle, outline: "none" }}
          placeholder="Any additional notes…"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending} style={{ background: "var(--color-green)", color: "#000" }} className="flex-1">
          {mutation.isPending ? "Saving…" : existing ? "Update Payment" : "Record Payment"}
        </Button>
        {existing && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
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

export default function Payments() {
  const [activeTab, setActiveTab] = useState("All");
  const [showDialog, setShowDialog] = useState(false);
  const [editPayment, setEditPayment] = useState<any>(null);

  const { data: payments = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/payments"],
    queryFn: () => apiRequest("GET", "/api/payments").then(r => r.json()),
  });

  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ["/api/leads"],
    queryFn: () => apiRequest("GET", "/api/leads").then(r => r.json()),
  });

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
    queryFn: () => apiRequest("GET", "/api/jobs").then(r => r.json()),
  });

  const leadsMap = Object.fromEntries(leads.map((l: any) => [l.id, l]));
  const jobsMap = Object.fromEntries(jobs.map((j: any) => [j.id, j]));

  const total = payments.reduce((s: number, p: any) => s + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)), 0);
  const deposits = payments.filter((p: any) => p.type === "deposit").reduce((s: number, p: any) => s + Number(p.amount), 0);
  const finals = payments.filter((p: any) => p.type === "final").reduce((s: number, p: any) => s + Number(p.amount), 0);
  const jobsTotal = jobs.reduce((s: number, j: any) => s + Number(j.totalAmount || 0), 0);
  const outstanding = Math.max(0, jobsTotal - total);

  const filtered = activeTab === "All"
    ? payments
    : payments.filter((p: any) => p.type === TAB_TYPE_MAP[activeTab]);

  // Group by job for summary
  const byJob: Record<string, { label: string; total: number; count: number }> = {};
  for (const p of payments) {
    const key = p.jobId ? `job-${p.jobId}` : `lead-${p.leadId}`;
    if (!byJob[key]) {
      const job = p.jobId ? jobsMap[p.jobId] : null;
      const lead = p.leadId ? leadsMap[p.leadId] : null;
      byJob[key] = {
        label: job ? (job.jobNumber || `Job #${p.jobId}`) : lead ? `${lead.firstName} ${lead.lastName}` : "Unknown",
        total: 0,
        count: 0,
      };
    }
    byJob[key].total += p.type === "refund" ? -Number(p.amount) : Number(p.amount);
    byJob[key].count++;
  }

  const stats = [
    { label: "Total Collected", value: fmt(total), icon: DollarSign, color: "#5CBF00" },
    { label: "Deposits", value: fmt(deposits), icon: TrendingUp, color: "#60a5fa" },
    { label: "Final Payments", value: fmt(finals), icon: CreditCard, color: "#c084fc" },
    { label: "Outstanding", value: fmt(outstanding), icon: AlertCircle, color: "#fb923c" },
  ];

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Payments &amp; Invoicing</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>Track all payments and collections</p>
        </div>
        <Button
          onClick={() => { setEditPayment(null); setShowDialog(true); }}
          style={{ background: "var(--color-green)", color: "#000", fontWeight: 600 }}
        >
          <Plus size={16} className="mr-2" /> Record Payment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

      {/* Payments Table */}
      <div className="rounded-xl border overflow-hidden mb-6" style={{ borderColor: "var(--color-border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
              {["Date", "Lead / Job", "Type", "Method", "Amount", "Reference #", "Notes", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: "var(--color-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center" style={{ color: "var(--color-muted)" }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center" style={{ color: "var(--color-muted)" }}>No payments found</td></tr>
            ) : filtered.map((p: any) => {
              const job = p.jobId ? jobsMap[p.jobId] : null;
              const lead = p.leadId ? leadsMap[p.leadId] : null;
              const label = job ? (job.jobNumber || `Job #${p.jobId}`) : lead ? `${lead.firstName} ${lead.lastName}` : "—";
              const typeBadge = TYPE_BADGE[p.type as PaymentType];
              const methodBadge = METHOD_BADGE[p.method as PaymentMethod];
              return (
                <tr
                  key={p.id}
                  className="border-b transition-colors cursor-pointer"
                  style={{ borderColor: "var(--color-border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-4 py-3 whitespace-nowrap">{p.datePaid ? new Date(p.datePaid).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 font-medium">{label}</td>
                  <td className="px-4 py-3">
                    {typeBadge && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: typeBadge.bg, color: typeBadge.color }}>
                        {typeBadge.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {methodBadge && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: methodBadge.bg, color: methodBadge.color }}>
                        {methodBadge.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: p.type === "refund" ? "#f87171" : "var(--color-green)" }}>
                    {p.type === "refund" ? "-" : ""}{fmt(Number(p.amount))}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--color-muted)" }}>{p.referenceNumber || "—"}</td>
                  <td className="px-4 py-3 max-w-xs truncate" style={{ color: "var(--color-muted)" }}>{p.notes || "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setEditPayment(p); setShowDialog(true); }}
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

      {/* Payment Summary by Job */}
      <div className="rounded-xl border p-5" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="text-base font-semibold mb-4">Payment Summary by Job</h2>
        {Object.keys(byJob).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>No payments recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(byJob).map(([key, info]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor: "var(--color-border)" }}>
                <div>
                  <span className="font-medium text-sm">{info.label}</span>
                  <span className="ml-2 text-xs" style={{ color: "var(--color-muted)" }}>{info.count} payment{info.count !== 1 ? "s" : ""}</span>
                </div>
                <span className="font-semibold" style={{ color: "var(--color-green)" }}>{fmt(info.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) { setShowDialog(false); setEditPayment(null); } }}>
        <DialogContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)", maxWidth: 560 }}>
          <DialogHeader>
            <DialogTitle>{editPayment ? "Edit Payment" : "Record Payment"}</DialogTitle>
          </DialogHeader>
          <PaymentForm onClose={() => { setShowDialog(false); setEditPayment(null); }} existing={editPayment} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
