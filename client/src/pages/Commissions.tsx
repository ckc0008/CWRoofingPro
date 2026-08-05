import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Plus, DollarSign, Clock, CheckCircle, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CommissionStatus = "pending" | "approved" | "paid";

const STATUS_COLORS: Record<CommissionStatus, { color: string; bg: string; label: string }> = {
  pending:  { color: "#f59e0b", bg: "#f59e0b20", label: "Pending" },
  approved: { color: "#3b82f6", bg: "#3b82f620", label: "Approved" },
  paid:     { color: "#22c55e", bg: "#22c55e20", label: "Paid" },
};

interface CommissionForm {
  salesRep: string;
  leadId: string;
  jobId: string;
  commissionRate: string;
  commissionAmount: string;
  status: CommissionStatus;
  datePaid: string;
  notes: string;
}

const EMPTY_FORM: CommissionForm = {
  salesRep: "", leadId: "", jobId: "",
  commissionRate: "10", commissionAmount: "",
  status: "pending", datePaid: "", notes: "",
};

function CommissionFormDialog({
  onClose,
  initial,
  onSubmit,
  onDelete,
  isPending,
  leads,
  jobs,
  commissions,
  title,
}: {
  onClose: () => void;
  initial: CommissionForm;
  onSubmit: (data: any) => void;
  onDelete?: () => void;
  isPending: boolean;
  leads: any[];
  jobs: any[];
  commissions: any[];
  title: string;
}) {
  const [form, setForm] = useState<CommissionForm>(initial);
  const set = (k: keyof CommissionForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  // Unique reps datalist
  const uniqueReps = useMemo(() => {
    const reps = new Set(commissions.map((c: any) => c.salesRep).filter(Boolean));
    return Array.from(reps) as string[];
  }, [commissions]);

  // Auto-calc amount when job or rate changes
  function recalcAmount(jobId: string, rate: string) {
    const job = jobs.find((j: any) => String(j.id) === jobId);
    if (job?.totalAmount && rate) {
      const amt = ((job.totalAmount * parseFloat(rate)) / 100).toFixed(2);
      set("commissionAmount", amt);
    }
  }

  function handleJobChange(v: string) {
    set("jobId", v);
    recalcAmount(v, form.commissionRate);
  }

  function handleRateChange(v: string) {
    set("commissionRate", v);
    recalcAmount(form.jobId, v);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      salesRep: form.salesRep,
      leadId: form.leadId ? Number(form.leadId) : null,
      jobId: form.jobId ? Number(form.jobId) : null,
      commissionRate: form.commissionRate ? parseFloat(form.commissionRate) : null,
      commissionAmount: form.commissionAmount ? parseFloat(form.commissionAmount) : null,
      status: form.status,
      datePaid: form.status === "paid" && form.datePaid ? form.datePaid : null,
      notes: form.notes,
    });
  }

  const inputStyle = { background: "var(--color-surface-2, #1a2030)", borderColor: "var(--color-border)", color: "var(--color-text)" };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Sales Rep */}
      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>SALES REP *</Label>
        <div className="mt-1 relative">
          <Input
            list="reps-list"
            value={form.salesRep}
            onChange={e => set("salesRep", e.target.value)}
            required
            placeholder="Enter name or pick from list"
            style={inputStyle}
          />
          <datalist id="reps-list">
            {uniqueReps.map(r => <option key={r} value={r} />)}
          </datalist>
        </div>
      </div>

      {/* Lead + Job */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>LEAD</Label>
          <Select value={form.leadId} onValueChange={v => set("leadId", v)}>
            <SelectTrigger className="mt-1" style={inputStyle}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <SelectItem value="none" style={{ color: "var(--color-muted)" }}>None</SelectItem>
              {leads.map((l: any) => (
                <SelectItem key={l.id} value={String(l.id)} style={{ color: "var(--color-text)" }}>
                  {l.firstName} {l.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>JOB</Label>
          <Select value={form.jobId} onValueChange={handleJobChange}>
            <SelectTrigger className="mt-1" style={inputStyle}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <SelectItem value="none" style={{ color: "var(--color-muted)" }}>None</SelectItem>
              {jobs.map((j: any) => (
                <SelectItem key={j.id} value={String(j.id)} style={{ color: "var(--color-text)" }}>
                  Job #{j.jobNumber || j.id}{j.totalAmount ? ` — $${j.totalAmount.toLocaleString()}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rate + Amount */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>COMMISSION RATE (%)</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={form.commissionRate}
            onChange={e => handleRateChange(e.target.value)}
            className="mt-1"
            style={inputStyle}
          />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>COMMISSION AMOUNT ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.commissionAmount}
            onChange={e => set("commissionAmount", e.target.value)}
            className="mt-1"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>STATUS</Label>
        <Select value={form.status} onValueChange={v => set("status", v as CommissionStatus)}>
          <SelectTrigger className="mt-1" style={inputStyle}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            {(["pending", "approved", "paid"] as CommissionStatus[]).map(s => (
              <SelectItem key={s} value={s} style={{ color: "var(--color-text)", textTransform: "capitalize" }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.status === "paid" && (
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
      )}

      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>NOTES</Label>
        <textarea
          value={form.notes}
          onChange={e => set("notes", e.target.value)}
          rows={3}
          className="w-full mt-1 rounded-md px-3 py-2 text-sm resize-none"
          style={{ background: "var(--color-surface-2, #1a2030)", border: "1px solid var(--color-border)", color: "var(--color-text)", outline: "none" }}
        />
      </div>

      <div className="flex gap-3 pt-2">
        {onDelete && (
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            style={{ borderColor: "#ef444440", color: "#ef4444", background: "transparent" }}
          >
            <Trash2 size={14} />
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose} className="flex-1"
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent" }}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="flex-1 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}>
          {isPending ? "Saving..." : "Save Commission"}
        </Button>
      </div>
    </form>
  );
}

export default function Commissions() {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | CommissionStatus>("all");

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ["/api/commissions"],
    queryFn: () => apiRequest("GET", "/api/commissions").then(r => r.json()),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
    queryFn: () => apiRequest("GET", "/api/leads").then(r => r.json()),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["/api/jobs"],
    queryFn: () => apiRequest("GET", "/api/jobs").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/commissions", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      toast({ title: "Commission added" });
      setShowAdd(false);
    },
    onError: () => toast({ title: "Failed to add commission", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/commissions/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      toast({ title: "Commission updated" });
      setEditTarget(null);
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/commissions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      toast({ title: "Commission deleted" });
      setEditTarget(null);
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const leadMap = Object.fromEntries(leads.map((l: any) => [l.id, l]));
  const jobMap = Object.fromEntries(jobs.map((j: any) => [j.id, j]));

  // Stats
  const totalAmount = commissions.reduce((s: number, c: any) => s + (c.commissionAmount || 0), 0);
  const pendingAmt = commissions.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + (c.commissionAmount || 0), 0);
  const approvedAmt = commissions.filter((c: any) => c.status === "approved").reduce((s: number, c: any) => s + (c.commissionAmount || 0), 0);
  const paidAmt = commissions.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + (c.commissionAmount || 0), 0);

  const filtered = filterStatus === "all" ? commissions : commissions.filter((c: any) => c.status === filterStatus);

  // Sales rep summary
  const repSummary: Record<string, { pending: number; approved: number; paid: number }> = {};
  commissions.forEach((c: any) => {
    const rep = c.salesRep || "Unknown";
    if (!repSummary[rep]) repSummary[rep] = { pending: 0, approved: 0, paid: 0 };
    const amt = c.commissionAmount || 0;
    if (c.status === "pending") repSummary[rep].pending += amt;
    else if (c.status === "approved") repSummary[rep].approved += amt;
    else if (c.status === "paid") repSummary[rep].paid += amt;
  });

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white" style={{ fontSize: 26 }}>COMMISSION TRACKER</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Track sales rep commissions and payouts</p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}
        >
          <Plus size={15} /> Add Commission
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Commissions", value: `$${totalAmount.toLocaleString()}`, color: "#8a9099" },
          { label: "Pending", value: `$${pendingAmt.toLocaleString()}`, color: "#f59e0b" },
          { label: "Approved", value: `$${approvedAmt.toLocaleString()}`, color: "#3b82f6" },
          { label: "Paid Out", value: `$${paidAmt.toLocaleString()}`, color: "#22c55e" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="font-display font-bold" style={{ fontSize: 26, color }}>{value}</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "pending", "approved", "paid"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilterStatus(tab)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: filterStatus === tab ? "var(--color-green)" : "var(--color-surface)",
              color: filterStatus === tab ? "#0a1500" : "var(--color-muted)",
              border: `1px solid ${filterStatus === tab ? "var(--color-green)" : "var(--color-border)"}`,
              textTransform: "capitalize",
            }}
          >
            {tab === "all" ? `All (${commissions.length})` :
              `${tab.charAt(0).toUpperCase() + tab.slice(1)} (${commissions.filter((c: any) => c.status === tab).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="section-panel overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <DollarSign size={40} style={{ color: "var(--color-muted)", margin: "0 auto 12px" }} />
            <div style={{ color: "var(--color-text)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No commissions</div>
            <div style={{ color: "var(--color-muted)", fontSize: 13 }}>
              {filterStatus === "all" ? "Add commissions to start tracking payouts" : `No ${filterStatus} commissions`}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sales Rep</th>
                  <th>Lead</th>
                  <th>Job #</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Paid Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => {
                  const lead = c.leadId ? leadMap[c.leadId] : null;
                  const job = c.jobId ? jobMap[c.jobId] : null;
                  const { color, bg, label } = STATUS_COLORS[c.status as CommissionStatus] ?? STATUS_COLORS.pending;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, color: "var(--color-text)", fontSize: 13 }}>
                        {c.salesRep || "—"}
                      </td>
                      <td>
                        {lead ? (
                          <Link href={`/crm/${lead.id}`}>
                            <a style={{ color: "var(--color-green)", fontSize: 12 }}>
                              {lead.firstName} {lead.lastName}
                            </a>
                          </Link>
                        ) : "—"}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--color-text)" }}>
                        {job ? `#${job.jobNumber || job.id}` : "—"}
                      </td>
                      <td style={{ fontSize: 13, color: "var(--color-text)" }}>
                        {c.commissionRate != null ? `${c.commissionRate}%` : "—"}
                      </td>
                      <td style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
                        {c.commissionAmount != null ? `$${Number(c.commissionAmount).toLocaleString()}` : "—"}
                      </td>
                      <td>
                        <span className="cw-badge" style={{ color, background: bg }}>
                          {label}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--color-muted)" }}>
                        {c.datePaid ? new Date(c.datePaid).toLocaleDateString() : "—"}
                      </td>
                      <td>
                        <button
                          onClick={() => setEditTarget(c)}
                          style={{ color: "var(--color-muted)", cursor: "pointer" }}
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sales Rep Summary */}
      {Object.keys(repSummary).length > 0 && (
        <div className="section-panel p-5">
          <div className="font-display font-bold text-white mb-4" style={{ fontSize: 14 }}>SALES REP SUMMARY</div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sales Rep</th>
                  <th>Pending</th>
                  <th>Approved</th>
                  <th>Paid</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(repSummary).map(([rep, totals]) => {
                  const total = totals.pending + totals.approved + totals.paid;
                  return (
                    <tr key={rep}>
                      <td style={{ fontWeight: 600, color: "var(--color-text)", fontSize: 13 }}>{rep}</td>
                      <td style={{ color: "#f59e0b", fontSize: 13 }}>${totals.pending.toLocaleString()}</td>
                      <td style={{ color: "#3b82f6", fontSize: 13 }}>${totals.approved.toLocaleString()}</td>
                      <td style={{ color: "#22c55e", fontSize: 13 }}>${totals.paid.toLocaleString()}</td>
                      <td style={{ fontWeight: 600, color: "var(--color-text)", fontSize: 14 }}>${total.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        >
          <DialogHeader>
            <DialogTitle className="font-display font-bold flex items-center gap-2" style={{ color: "var(--color-text)", fontSize: 20 }}>
              <DollarSign size={18} style={{ color: "var(--color-green)" }} /> ADD COMMISSION
            </DialogTitle>
          </DialogHeader>
          <CommissionFormDialog
            initial={EMPTY_FORM}
            onClose={() => setShowAdd(false)}
            onSubmit={data => createMutation.mutate(data)}
            isPending={createMutation.isPending}
            leads={leads}
            jobs={jobs}
            commissions={commissions}
            title="Add Commission"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        >
          <DialogHeader>
            <DialogTitle className="font-display font-bold flex items-center gap-2" style={{ color: "var(--color-text)", fontSize: 20 }}>
              <Edit2 size={18} style={{ color: "var(--color-green)" }} /> EDIT COMMISSION
            </DialogTitle>
          </DialogHeader>
          {editTarget && (
            <>
              {/* Quick mark as paid button */}
              {editTarget.status !== "paid" && (
                <Button
                  onClick={() => updateMutation.mutate({ id: editTarget.id, data: { status: "paid", datePaid: new Date().toISOString().split("T")[0] } })}
                  className="w-full font-semibold flex items-center gap-2"
                  style={{ background: "var(--color-green-dim)", color: "var(--color-green)", border: "1px solid var(--color-green)" }}
                  disabled={updateMutation.isPending}
                >
                  <CheckCircle size={15} /> Mark as Paid
                </Button>
              )}
              <CommissionFormDialog
                initial={{
                  salesRep: editTarget.salesRep || "",
                  leadId: editTarget.leadId ? String(editTarget.leadId) : "",
                  jobId: editTarget.jobId ? String(editTarget.jobId) : "",
                  commissionRate: editTarget.commissionRate != null ? String(editTarget.commissionRate) : "",
                  commissionAmount: editTarget.commissionAmount != null ? String(editTarget.commissionAmount) : "",
                  status: editTarget.status || "pending",
                  datePaid: editTarget.datePaid ? editTarget.datePaid.split("T")[0] : "",
                  notes: editTarget.notes || "",
                }}
                onClose={() => setEditTarget(null)}
                onSubmit={data => updateMutation.mutate({ id: editTarget.id, data })}
                onDelete={() => { if (confirm("Delete this commission?")) deleteMutation.mutate(editTarget.id); }}
                isPending={updateMutation.isPending}
                leads={leads}
                jobs={jobs}
                commissions={commissions}
                title="Edit Commission"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
