import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Phone, Mail, Building2, Wrench, Users, Pencil, Trash2, ToggleLeft, ToggleRight, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Trade = "roofing" | "gutters" | "siding" | "general" | "electrical" | "plumbing";
type RateType = "per_square" | "per_job" | "hourly";

const TRADE_BADGE: Record<Trade, { label: string; bg: string; color: string }> = {
  roofing:    { label: "Roofing",    bg: "rgba(59,130,246,0.15)",  color: "#60a5fa" },
  gutters:    { label: "Gutters",    bg: "rgba(6,182,212,0.15)",   color: "#22d3ee" },
  siding:     { label: "Siding",     bg: "rgba(249,115,22,0.15)",  color: "#fb923c" },
  general:    { label: "General",    bg: "rgba(148,163,184,0.15)", color: "#94a3b8" },
  electrical: { label: "Electrical", bg: "rgba(234,179,8,0.15)",   color: "#eab308" },
  plumbing:   { label: "Plumbing",   bg: "rgba(92,191,0,0.15)",    color: "#5CBF00" },
};

const RATE_TYPE_LABELS: Record<RateType, string> = {
  per_square: "/sq",
  per_job: "/job",
  hourly: "/hr",
};

const inputStyle = {
  background: "var(--color-surface)",
  borderColor: "var(--color-border)",
  color: "var(--color-text)",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function SubForm({ onClose, existing }: { onClose: () => void; existing?: any }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: existing?.name || "",
    company: existing?.company || "",
    phone: existing?.phone || "",
    email: existing?.email || "",
    trade: (existing?.trade as Trade) || "roofing",
    rateType: (existing?.rateType as RateType) || "per_square",
    rate: existing?.rate ? String(existing.rate) : "",
    active: existing?.active !== undefined ? Boolean(existing.active) : true,
    notes: existing?.notes || "",
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: any) => existing
      ? apiRequest("PATCH", `/api/subcontractors/${existing.id}`, data).then(r => r.json())
      : apiRequest("POST", "/api/subcontractors", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subcontractors"] });
      toast({ title: existing ? "Subcontractor updated" : "Subcontractor added" });
      onClose();
    },
    onError: () => toast({ title: "Error saving", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/subcontractors/${existing?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subcontractors"] });
      toast({ title: "Subcontractor removed" });
      onClose();
    },
    onError: () => toast({ title: "Error deleting", variant: "destructive" }),
  });

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        mutation.mutate({ ...form, rate: form.rate ? Number(form.rate) : null });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>NAME *</Label>
          <Input required value={form.name} onChange={e => set("name", e.target.value)} className="mt-1" style={inputStyle} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>COMPANY</Label>
          <Input value={form.company} onChange={e => set("company", e.target.value)} className="mt-1" style={inputStyle} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>PHONE</Label>
          <Input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} className="mt-1" style={inputStyle} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>EMAIL</Label>
          <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} className="mt-1" style={inputStyle} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>TRADE</Label>
          <Select value={form.trade} onValueChange={v => set("trade", v)}>
            <SelectTrigger className="mt-1" style={inputStyle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {(Object.keys(TRADE_BADGE) as Trade[]).map(t => (
                <SelectItem key={t} value={t}>{TRADE_BADGE[t].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>RATE TYPE</Label>
          <Select value={form.rateType} onValueChange={v => set("rateType", v)}>
            <SelectTrigger className="mt-1" style={inputStyle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <SelectItem value="per_square">Per Square</SelectItem>
              <SelectItem value="per_job">Per Job</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>RATE ($)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.rate}
            onChange={e => set("rate", e.target.value)}
            className="mt-1"
            style={inputStyle}
            placeholder="0.00"
          />
        </div>
        <div className="flex flex-col justify-end pb-1">
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>ACTIVE</Label>
          <button
            type="button"
            onClick={() => set("active", !form.active)}
            className="mt-1 flex items-center gap-2 text-sm"
            style={{ color: form.active ? "var(--color-green)" : "var(--color-muted)" }}
          >
            {form.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            {form.active ? "Active" : "Inactive"}
          </button>
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
          placeholder="Any additional notes…"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending} style={{ background: "var(--color-green)", color: "#000" }} className="flex-1">
          {mutation.isPending ? "Saving…" : existing ? "Update" : "Add Subcontractor"}
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

function AssignForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    subcontractorId: "",
    jobId: "",
    agreedAmount: "",
    assignedDate: today(),
    notes: "",
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const { data: subs = [] } = useQuery<any[]>({
    queryKey: ["/api/subcontractors"],
    queryFn: () => apiRequest("GET", "/api/subcontractors").then(r => r.json()),
  });

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
    queryFn: () => apiRequest("GET", "/api/jobs").then(r => r.json()),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/assignments", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({ title: "Assignment created" });
      onClose();
    },
    onError: () => toast({ title: "Error creating assignment", variant: "destructive" }),
  });

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        mutation.mutate({
          subcontractorId: Number(form.subcontractorId),
          jobId: Number(form.jobId),
          agreedAmount: form.agreedAmount ? Number(form.agreedAmount) : null,
          assignedDate: form.assignedDate,
          notes: form.notes,
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>SUBCONTRACTOR *</Label>
          <Select value={form.subcontractorId} onValueChange={v => set("subcontractorId", v)}>
            <SelectTrigger className="mt-1" style={inputStyle}>
              <SelectValue placeholder="Select sub…" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {subs.map((s: any) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}{s.company ? ` — ${s.company}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>JOB *</Label>
          <Select value={form.jobId} onValueChange={v => set("jobId", v)}>
            <SelectTrigger className="mt-1" style={inputStyle}>
              <SelectValue placeholder="Select job…" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {jobs.map((j: any) => (
                <SelectItem key={j.id} value={String(j.id)}>{j.jobNumber || `Job #${j.id}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>AGREED AMOUNT ($)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.agreedAmount}
            onChange={e => set("agreedAmount", e.target.value)}
            className="mt-1"
            style={inputStyle}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>ASSIGNED DATE</Label>
          <Input
            type="date"
            value={form.assignedDate}
            onChange={e => set("assignedDate", e.target.value)}
            className="mt-1"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>NOTES</Label>
        <textarea
          value={form.notes}
          onChange={e => set("notes", e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm resize-none"
          style={{ ...inputStyle, outline: "none" }}
          placeholder="Notes…"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending || !form.subcontractorId || !form.jobId}
          style={{ background: "var(--color-green)", color: "#000" }}
          className="flex-1"
        >
          {mutation.isPending ? "Assigning…" : "Assign to Job"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ActiveToggle({ sub }: { sub: any }) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/subcontractors/${sub.id}`, { active: !sub.active }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subcontractors"] });
      toast({ title: `${sub.name} marked ${!sub.active ? "active" : "inactive"}` });
    },
    onError: () => toast({ title: "Error updating status", variant: "destructive" }),
  });

  return (
    <button
      onClick={e => { e.stopPropagation(); mutation.mutate(); }}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-opacity hover:opacity-80"
      style={{
        background: sub.active ? "rgba(92,191,0,0.1)" : "rgba(148,163,184,0.1)",
        color: sub.active ? "var(--color-green)" : "var(--color-muted)",
        border: `1px solid ${sub.active ? "var(--color-green)" : "var(--color-border)"}`,
      }}
    >
      {sub.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
      {sub.active ? "Active" : "Inactive"}
    </button>
  );
}

export default function Subcontractors() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editSub, setEditSub] = useState<any>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const { data: subs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/subcontractors"],
    queryFn: () => apiRequest("GET", "/api/subcontractors").then(r => r.json()),
  });

  const totalSubs = subs.length;
  const activeSubs = subs.filter((s: any) => s.active).length;

  // Top 3 trades by count
  const tradeCounts: Record<string, number> = {};
  for (const s of subs) {
    const t = s.trade || "general";
    tradeCounts[t] = (tradeCounts[t] || 0) + 1;
  }
  const topTrades = Object.entries(tradeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Subcontractors</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>Manage your subcontractor network</p>
        </div>
        <Button
          onClick={() => { setEditSub(null); setShowAddDialog(true); }}
          style={{ background: "var(--color-green)", color: "#000", fontWeight: 600 }}
        >
          <Plus size={16} className="mr-2" /> Add Subcontractor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 border" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} style={{ color: "#94a3b8" }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Total Subs</span>
          </div>
          <p className="text-xl font-bold">{totalSubs}</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} style={{ color: "#5CBF00" }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Active</span>
          </div>
          <p className="text-xl font-bold" style={{ color: "var(--color-green)" }}>{activeSubs}</p>
        </div>
        {topTrades.map(([trade, count]) => {
          const badge = TRADE_BADGE[trade as Trade] || TRADE_BADGE.general;
          return (
            <div key={trade} className="rounded-xl p-4 border" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Wrench size={16} style={{ color: badge.color }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>{badge.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: badge.color }}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="text-center py-16" style={{ color: "var(--color-muted)" }}>Loading subcontractors…</div>
      ) : subs.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}>
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>No subcontractors yet. Click "Add Subcontractor" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {subs.map((s: any) => {
            const trade = (s.trade as Trade) || "general";
            const badge = TRADE_BADGE[trade] || TRADE_BADGE.general;
            const rateLabel = s.rate
              ? `$${Number(s.rate).toLocaleString()}${RATE_TYPE_LABELS[s.rateType as RateType] || ""}`
              : null;

            return (
              <div
                key={s.id}
                className="rounded-xl border p-4 flex flex-col gap-3 transition-all"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  opacity: s.active ? 1 : 0.6,
                }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{s.name}</h3>
                    {s.company && (
                      <p className="text-xs mt-0.5 flex items-center gap-1 truncate" style={{ color: "var(--color-muted)" }}>
                        <Building2 size={11} /> {s.company}
                      </p>
                    )}
                  </div>
                  <span
                    className="ml-2 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Rate */}
                {rateLabel && (
                  <div className="text-sm font-semibold" style={{ color: "var(--color-green)" }}>
                    {rateLabel}
                  </div>
                )}

                {/* Contact */}
                <div className="space-y-1">
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      className="flex items-center gap-2 text-xs hover:opacity-80"
                      style={{ color: "var(--color-muted)" }}
                      onClick={e => e.stopPropagation()}
                    >
                      <Phone size={12} /> {s.phone}
                    </a>
                  )}
                  {s.email && (
                    <a
                      href={`mailto:${s.email}`}
                      className="flex items-center gap-2 text-xs hover:opacity-80"
                      style={{ color: "var(--color-muted)" }}
                      onClick={e => e.stopPropagation()}
                    >
                      <Mail size={12} /> {s.email}
                    </a>
                  )}
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--color-border)" }}>
                  <ActiveToggle sub={s} />
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditSub(s); setShowAddDialog(true); }}
                      className="p-1.5 rounded hover:opacity-80"
                      style={{ color: "var(--color-muted)", background: "rgba(255,255,255,0.05)" }}
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Job Assignments Section */}
      <div className="rounded-xl border p-5 mb-6" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Job Assignments</h2>
          <Button
            size="sm"
            onClick={() => setShowAssignDialog(true)}
            style={{ background: "var(--color-green-dim)", color: "var(--color-green)", border: "1px solid var(--color-green)" }}
            variant="outline"
          >
            <CalendarPlus size={14} className="mr-1.5" /> Assign to Job
          </Button>
        </div>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Assignments are managed per-job in the Jobs module. Use "Assign to Job" above to quickly link a subcontractor to a job.
        </p>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={v => { if (!v) { setShowAddDialog(false); setEditSub(null); } }}>
        <DialogContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)", maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>{editSub ? "Edit Subcontractor" : "Add Subcontractor"}</DialogTitle>
          </DialogHeader>
          <SubForm onClose={() => { setShowAddDialog(false); setEditSub(null); }} existing={editSub} />
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={v => { if (!v) setShowAssignDialog(false); }}>
        <DialogContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)", maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle>Assign Subcontractor to Job</DialogTitle>
          </DialogHeader>
          <AssignForm onClose={() => setShowAssignDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
