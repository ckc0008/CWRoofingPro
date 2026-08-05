import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Plus, Briefcase, Activity, CheckCircle2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const JOB_STATUSES = ["inspection", "estimate-sent", "approved", "in-progress", "complete", "invoiced", "paid"] as const;
const JOB_TYPES = ["roof-replacement", "roof-repair", "gutters", "siding", "storm-damage"] as const;

function jobStatusBadge(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    inspection:      { label: "Inspection",   color: "#8a9099", bg: "rgba(138,144,153,0.12)" },
    "estimate-sent": { label: "Est. Sent",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    approved:        { label: "Approved",     color: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
    "in-progress":   { label: "In Progress",  color: "#f97316", bg: "rgba(249,115,22,0.12)" },
    complete:        { label: "Complete",     color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    invoiced:        { label: "Invoiced",     color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
    paid:            { label: "Paid",         color: "#5cbf00", bg: "rgba(92,191,0,0.12)" },
  };
  const s = map[status] || { label: status, color: "#8a9099", bg: "rgba(138,144,153,0.12)" };
  return (
    <span className="cw-badge flex-shrink-0" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function autoJobNumber(jobs: any[]) {
  const year = new Date().getFullYear();
  const seq = (jobs.length + 1).toString().padStart(3, "0");
  return `JOB-${year}-${seq}`;
}

const EMPTY_FORM = {
  leadId: "",
  jobNumber: "",
  jobType: "roof-replacement",
  status: "inspection",
  scheduledDate: "",
  completedDate: "",
  crewLead: "",
  totalAmount: "",
  depositAmount: "",
  depositPaid: false,
  materialBrand: "",
  materialColor: "",
  warrantyYears: "",
  notes: "",
};

type FormState = typeof EMPTY_FORM;

function JobForm({
  form,
  setForm,
  leads,
  onSubmit,
  onDelete,
  onClose,
  isPending,
  isEdit,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  leads: any[];
  onSubmit: () => void;
  onDelete?: () => void;
  onClose: () => void;
  isPending: boolean;
  isEdit: boolean;
}) {
  const set = (k: keyof FormState, v: string | boolean) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
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
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>JOB NUMBER</Label>
          <Input value={form.jobNumber} onChange={e => set("jobNumber", e.target.value)}
            placeholder="Auto-generated"
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>JOB TYPE</Label>
          <Select value={form.jobType} onValueChange={v => set("jobType", v)}>
            <SelectTrigger className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {JOB_TYPES.map(t => (
                <SelectItem key={t} value={t} style={{ color: "var(--color-text)" }}>
                  {t.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>STATUS</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {JOB_STATUSES.map(s => (
                <SelectItem key={s} value={s} style={{ color: "var(--color-text)" }}>
                  {s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>CREW LEAD</Label>
          <Input value={form.crewLead} onChange={e => set("crewLead", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>SCHEDULED DATE</Label>
          <Input type="date" value={form.scheduledDate} onChange={e => set("scheduledDate", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>COMPLETED DATE</Label>
          <Input type="date" value={form.completedDate} onChange={e => set("completedDate", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>TOTAL AMOUNT ($)</Label>
          <Input type="number" value={form.totalAmount} onChange={e => set("totalAmount", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>DEPOSIT AMOUNT ($)</Label>
          <Input type="number" value={form.depositAmount} onChange={e => set("depositAmount", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <input type="checkbox" id="depositPaid" checked={form.depositPaid}
            onChange={e => set("depositPaid", e.target.checked)}
            className="w-4 h-4 rounded" style={{ accentColor: "var(--color-green)" }} />
          <label htmlFor="depositPaid" style={{ fontSize: 13, color: "var(--color-text)", cursor: "pointer" }}>Deposit Paid</label>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>MATERIAL BRAND</Label>
          <Input value={form.materialBrand} onChange={e => set("materialBrand", e.target.value)}
            placeholder="GAF, Owens Corning..."
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>MATERIAL COLOR</Label>
          <Input value={form.materialColor} onChange={e => set("materialColor", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>WARRANTY YEARS</Label>
          <Input type="number" value={form.warrantyYears} onChange={e => set("warrantyYears", e.target.value)}
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
          {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Job"}
        </Button>
      </div>
    </div>
  );
}

const FILTER_TABS = ["All", "Inspection", "Estimate Sent", "Approved", "In Progress", "Complete", "Invoiced", "Paid"] as const;

const TAB_STATUS_MAP: Record<string, string> = {
  "All": "all",
  "Inspection": "inspection",
  "Estimate Sent": "estimate-sent",
  "Approved": "approved",
  "In Progress": "in-progress",
  "Complete": "complete",
  "Invoiced": "invoiced",
  "Paid": "paid",
};

export default function Jobs() {
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [editJob, setEditJob] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["/api/jobs"],
    queryFn: () => apiRequest("GET", "/api/jobs").then(r => r.json()),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
    queryFn: () => apiRequest("GET", "/api/leads").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/jobs", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job created" });
      setShowNew(false);
      setForm({ ...EMPTY_FORM });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/jobs/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job updated" });
      setEditJob(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/jobs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job deleted" });
      setEditJob(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openEdit(job: any) {
    setForm({
      leadId: String(job.leadId || ""),
      jobNumber: job.jobNumber || "",
      jobType: job.jobType || "roof-replacement",
      status: job.status || "inspection",
      scheduledDate: job.scheduledDate ? job.scheduledDate.split("T")[0] : "",
      completedDate: job.completedDate ? job.completedDate.split("T")[0] : "",
      crewLead: job.crewLead || "",
      totalAmount: job.totalAmount != null ? String(job.totalAmount) : "",
      depositAmount: job.depositAmount != null ? String(job.depositAmount) : "",
      depositPaid: !!job.depositPaid,
      materialBrand: job.materialBrand || "",
      materialColor: job.materialColor || "",
      warrantyYears: job.warrantyYears != null ? String(job.warrantyYears) : "",
      notes: job.notes || "",
    });
    setEditJob(job);
  }

  function handleCreate() {
    if (!form.leadId) { toast({ title: "Lead is required", variant: "destructive" }); return; }
    const jobNumber = form.jobNumber || autoJobNumber(jobs);
    createMutation.mutate({
      ...form,
      jobNumber,
      leadId: Number(form.leadId),
      totalAmount: form.totalAmount ? Number(form.totalAmount) : null,
      depositAmount: form.depositAmount ? Number(form.depositAmount) : null,
      warrantyYears: form.warrantyYears ? Number(form.warrantyYears) : null,
    });
  }

  function handleUpdate() {
    if (!editJob) return;
    updateMutation.mutate({
      id: editJob.id,
      data: {
        ...form,
        leadId: Number(form.leadId),
        totalAmount: form.totalAmount ? Number(form.totalAmount) : null,
        depositAmount: form.depositAmount ? Number(form.depositAmount) : null,
        warrantyYears: form.warrantyYears ? Number(form.warrantyYears) : null,
      },
    });
  }

  const leadMap = Object.fromEntries(leads.map((l: any) => [l.id, l]));
  const statusFilter = TAB_STATUS_MAP[activeTab] || "all";
  const filtered = statusFilter === "all" ? jobs : jobs.filter((j: any) => j.status === statusFilter);

  const totalRevenue = jobs.filter((j: any) => ["complete", "invoiced", "paid"].includes(j.status))
    .reduce((s: number, j: any) => s + (j.totalAmount || 0), 0);
  const inProgress = jobs.filter((j: any) => j.status === "in-progress").length;
  const completed = jobs.filter((j: any) => ["complete", "invoiced", "paid"].includes(j.status)).length;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white" style={{ fontSize: 26 }}>JOBS & SCHEDULING</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Manage roofing jobs and crew scheduling</p>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY_FORM }); setShowNew(true); }}
          className="flex items-center gap-2 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}>
          <Plus size={15} /> New Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Jobs", value: jobs.length, icon: Briefcase, color: "#5cbf00" },
          { label: "In Progress", value: inProgress, icon: Activity, color: "#f97316" },
          { label: "Completed", value: completed, icon: CheckCircle2, color: "#22c55e" },
          { label: "Total Revenue", value: `$${(totalRevenue / 1000).toFixed(1)}K`, icon: DollarSign, color: "#0ea5e9" },
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
      <div className="flex gap-1 flex-wrap" style={{ borderBottom: "1px solid var(--color-border)" }}>
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

      {/* Jobs Table */}
      <div className="section-panel overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase size={40} style={{ color: "var(--color-muted)", margin: "0 auto 12px" }} />
            <div style={{ color: "var(--color-text)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No jobs found</div>
            <div style={{ color: "var(--color-muted)", fontSize: 13 }}>Click "New Job" to add a job</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job #</th>
                  <th>Lead Name</th>
                  <th>Job Type</th>
                  <th>Status</th>
                  <th>Scheduled</th>
                  <th>Crew Lead</th>
                  <th>Total Amount</th>
                  <th>Deposit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job: any) => {
                  const lead = leadMap[job.leadId];
                  return (
                    <tr key={job.id} onClick={() => openEdit(job)}
                      className="cursor-pointer hover:bg-white/5 transition-colors">
                      <td style={{ color: "var(--color-green)", fontSize: 13, fontFamily: "monospace", fontWeight: 600 }}>
                        {job.jobNumber || `#${job.id}`}
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
                      <td style={{ fontSize: 12, color: "var(--color-text)", textTransform: "capitalize" }}>
                        {job.jobType?.replace(/-/g, " ") || "—"}
                      </td>
                      <td>{jobStatusBadge(job.status)}</td>
                      <td style={{ fontSize: 11, color: "var(--color-muted)" }}>
                        {job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--color-text)" }}>{job.crewLead || "—"}</td>
                      <td style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                        {job.totalAmount != null ? `$${Number(job.totalAmount).toLocaleString()}` : "—"}
                      </td>
                      <td>
                        {job.depositPaid ? (
                          <span className="cw-badge" style={{ color: "#22c55e", background: "rgba(34,197,94,0.12)" }}>Paid</span>
                        ) : (
                          <span className="cw-badge" style={{ color: "#8a9099", background: "rgba(138,144,153,0.12)" }}>Unpaid</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Job Dialog */}
      <Dialog open={showNew} onOpenChange={v => { setShowNew(v); if (!v) setForm({ ...EMPTY_FORM }); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          <DialogHeader>
            <DialogTitle className="font-display font-bold" style={{ color: "var(--color-text)", fontSize: 20 }}>
              NEW JOB
            </DialogTitle>
          </DialogHeader>
          <JobForm
            form={form} setForm={setForm} leads={leads}
            onSubmit={handleCreate} onClose={() => setShowNew(false)}
            isPending={createMutation.isPending} isEdit={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={!!editJob} onOpenChange={v => { if (!v) setEditJob(null); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          <DialogHeader>
            <DialogTitle className="font-display font-bold" style={{ color: "var(--color-text)", fontSize: 20 }}>
              EDIT JOB — {editJob?.jobNumber || `#${editJob?.id}`}
            </DialogTitle>
          </DialogHeader>
          <JobForm
            form={form} setForm={setForm} leads={leads}
            onSubmit={handleUpdate}
            onDelete={() => editJob && deleteMutation.mutate(editJob.id)}
            onClose={() => setEditJob(null)}
            isPending={updateMutation.isPending || deleteMutation.isPending}
            isEdit={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
