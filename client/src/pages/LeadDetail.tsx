import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_BASE } from "@/lib/queryClient";
import { useParams, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "./Dashboard";
import { LeadForm } from "./CRM";
import {
  ArrowLeft, Phone, Mail, MapPin, Edit2, FileText,
  Plus, Send, Clock, CheckCircle2, Briefcase, Ruler,
  ShieldCheck, FileSignature, DollarSign, FolderOpen,
  Download, Trash2, Upload, ExternalLink, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ─── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="section-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-white" style={{ fontSize: 15 }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Source badge for measurements ──────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  artemis: "#5cbf00", "google-solar": "#0ea5e9", estimated: "#f59e0b", demo: "#8a9099", manual: "#8b5cf6",
  "uploaded-report": "#f97316",
};
const SOURCE_LABELS: Record<string, string> = {
  artemis: "Artemis (Nearmap)", "google-solar": "Google Solar", estimated: "Estimated", demo: "Demo", manual: "Manual",
  "uploaded-report": "PDF Report",
};

// ─── Doc type badge ──────────────────────────────────────────────────────────
const DOC_TYPE_COLORS: Record<string, string> = {
  declarations: "#3b82f6", "adjuster-report": "#f59e0b", permit: "#f97316",
  contract: "#5cbf00", warranty: "#8b5cf6", photo: "#8a9099", invoice: "#06b6d4", other: "#6b7280",
};

function DocTypeBadge({ type }: { type: string }) {
  const color = DOC_TYPE_COLORS[type] || "#6b7280";
  return (
    <span className="cw-badge" style={{ color, background: `${color}22`, fontSize: 10 }}>
      {type?.replace(/-/g, " ").toUpperCase()}
    </span>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Document Upload Dialog ──────────────────────────────────────────────────
function DocumentUploadDialog({ leadId, open, onClose }: { leadId: number; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [docType, setDocType] = useState("other");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const DOC_TYPES = [
    { value: "declarations", label: "Declarations Page" },
    { value: "adjuster-report", label: "Adjuster Report" },
    { value: "permit", label: "Building Permit" },
    { value: "contract", label: "Contract / Agreement" },
    { value: "warranty", label: "Warranty Document" },
    { value: "photo", label: "Photo / Image" },
    { value: "invoice", label: "Invoice / Statement" },
    { value: "other", label: "Other" },
  ];

  async function handleUpload() {
    if (!file) { toast({ title: "Please select a file", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("docType", docType);
      fd.append("leadId", String(leadId));
      if (notes) fd.append("notes", notes);
      const res = await fetch(`${API_BASE}/api/documents/upload`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: ["/api/leads", String(leadId), "documents"] });
      toast({ title: "Document uploaded successfully" });
      setFile(null); setNotes(""); setDocType("other");
      onClose();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const inputStyle = {
    background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
    borderRadius: 6, color: "var(--color-text)", fontSize: 13, padding: "8px 10px", width: "100%",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
        <DialogHeader>
          <DialogTitle className="font-display font-bold" style={{ color: "var(--color-text)", fontSize: 18 }}>
            UPLOAD DOCUMENT
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* File picker */}
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
            style={{ border: "2px dashed var(--color-border)", padding: "24px 16px", background: "var(--color-surface-2)" }}
          >
            <Upload size={24} style={{ color: "var(--color-muted)" }} />
            {file ? (
              <span style={{ fontSize: 13, color: "var(--color-green)" }}>{file.name} ({formatBytes(file.size)})</span>
            ) : (
              <span style={{ fontSize: 13, color: "var(--color-muted)" }}>Click to select a file (PDF, XML, JPG, PNG, DOCX…)</span>
            )}
            <input ref={fileRef} type="file" accept="application/pdf,.pdf,text/xml,application/xml,.xml,image/*,.doc,.docx,.xlsx,.xls,.txt,.csv" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>

          {/* Doc Type */}
          <div>
            <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 5, fontWeight: 600, letterSpacing: "0.05em" }}>DOCUMENT TYPE</div>
            <select value={docType} onChange={e => setDocType(e.target.value)} style={inputStyle}>
              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 5, fontWeight: 600, letterSpacing: "0.05em" }}>NOTES (OPTIONAL)</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. State Farm determination letter, dated 5/15/2026"
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1" style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent" }}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !file} className="flex-1"
              style={{ background: "var(--color-green)", color: "#000", fontWeight: 700 }}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
const TABS = [
  { key: "overview",    label: "Overview",        icon: CheckCircle2 },
  { key: "measurements",label: "Measurements",    icon: Ruler },
  { key: "estimates",   label: "Estimates",       icon: FileText },
  { key: "jobs",        label: "Jobs",            icon: Briefcase },
  { key: "insurance",   label: "Insurance",       icon: ShieldCheck },
  { key: "contracts",   label: "Contracts",       icon: FileSignature },
  { key: "payments",    label: "Payments",        icon: DollarSign },
  { key: "documents",   label: "Documents",       icon: FolderOpen },
  { key: "emails",      label: "Emails",          icon: Mail },
];

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reportUploading, setReportUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const reportInputRef = useRef<HTMLInputElement>(null);
  const [emailType, setEmailType] = useState("follow-up");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: lead, isLoading } = useQuery({
    queryKey: ["/api/leads", id],
    queryFn: () => apiRequest("GET", `/api/leads/${id}`).then(r => r.json()),
  });
  const { data: jobs = [] } = useQuery({
    queryKey: ["/api/leads", id, "jobs"],
    queryFn: () => apiRequest("GET", `/api/leads/${id}/jobs`).then(r => r.json()),
  });
  const { data: estimates = [] } = useQuery({
    queryKey: ["/api/leads", id, "estimates"],
    queryFn: () => apiRequest("GET", `/api/leads/${id}/estimates`).then(r => r.json()),
  });
  const { data: emails = [] } = useQuery({
    queryKey: ["/api/leads", id, "emails"],
    queryFn: () => apiRequest("GET", `/api/leads/${id}/emails`).then(r => r.json()),
  });
  const { data: measurements = [] } = useQuery({
    queryKey: ["/api/leads", id, "measurements"],
    queryFn: () => apiRequest("GET", `/api/leads/${id}/measurements`).then(r => r.json()),
  });
  const { data: insuranceClaims = [] } = useQuery({
    queryKey: ["/api/leads", id, "insurance-claims"],
    queryFn: () => apiRequest("GET", `/api/leads/${id}/insurance-claims`).then(r => r.json()),
  });
  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/leads", id, "contracts"],
    queryFn: () => apiRequest("GET", `/api/leads/${id}/contracts`).then(r => r.json()),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["/api/leads", id, "payments"],
    queryFn: () => apiRequest("GET", `/api/leads/${id}/payments`).then(r => r.json()),
  });
  const { data: documents = [] } = useQuery({
    queryKey: ["/api/leads", id, "documents"],
    queryFn: () => apiRequest("GET", `/api/leads/${id}/documents`).then(r => r.json()),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: (status: string) => apiRequest("PATCH", `/api/leads/${id}`, { status }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Status updated" });
    },
  });

  const emailMutation = useMutation({
    mutationFn: (type: string) => apiRequest("POST", "/api/emails/send", { leadId: Number(id), type }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", id, "emails"] });
      toast({ title: "Email sent" });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: number) => apiRequest("DELETE", `/api/documents/${docId}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", id, "documents"] });
      toast({ title: "Document deleted" });
    },
  });

  async function handleReportUpload(file: File) {
    if (!file) return;
    const name = file.name.toLowerCase();
    const isValid = file.type === "application/pdf" || file.type === "text/xml" || file.type === "application/xml"
      || name.endsWith(".pdf") || name.endsWith(".xml");
    if (!isValid) {
      toast({ title: "PDF or XML files only", description: "Upload a PDF or XML measurement report from EagleView, GAF, Roofr, etc.", variant: "destructive" });
      return;
    }
    setReportUploading(true);
    try {
      const fd = new FormData();
      fd.append("report", file);
      const res = await fetch(`${API_BASE}/api/leads/${id}/measurements/upload-report`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/leads", id, "measurements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", id, "documents"] });
      toast({
        title: `${data.provider} report imported`,
        description: `${data.extractedFields?.squares ?? "?"} squares extracted successfully`,
      });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setReportUploading(false);
      setDragOver(false);
    }
  }

  if (isLoading) return <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Loading…</div>;
  if (!lead) return <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Lead not found</div>;

  const totalJobValue = jobs.reduce((s: number, j: any) => s + (j.totalAmount || 0), 0);
  const totalPaid = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);

  // ── Tab counts for badges ─────────────────────────────────────────────────
  const counts: Record<string, number> = {
    measurements: measurements.length,
    estimates: estimates.length,
    jobs: jobs.length,
    insurance: insuranceClaims.length,
    contracts: contracts.length,
    payments: payments.length,
    documents: documents.length,
    emails: emails.length,
  };

  // ── Shared cell style ──────────────────────────────────────────────────────
  const td = { fontSize: 12, color: "var(--color-text)" };
  const tdMuted = { fontSize: 12, color: "var(--color-muted)" };

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Back nav */}
      <Link href="/crm">
        <a className="inline-flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity" style={{ color: "var(--color-muted)" }}>
          <ArrowLeft size={14} /> Back to CRM
        </a>
      </Link>

      {/* Header card */}
      <div className="section-panel p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0"
            style={{ background: "var(--color-green-dim)", color: "var(--color-green)" }}>
            {lead.firstName[0]}{lead.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-white" style={{ fontSize: 24 }}>
              {lead.firstName.toUpperCase()} {lead.lastName.toUpperCase()}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-1">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:opacity-80" style={{ fontSize: 13, color: "var(--color-muted)" }}>
                  <Phone size={12} /> {lead.phone}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:opacity-80" style={{ fontSize: 13, color: "var(--color-muted)" }}>
                  <Mail size={12} /> {lead.email}
                </a>
              )}
              {lead.address && (
                <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: "var(--color-muted)" }}>
                  <MapPin size={12} /> {lead.address}{lead.city ? `, ${lead.city}` : ""}{lead.zip ? ` ${lead.zip}` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <StatusBadge status={lead.status} />
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)", background: "transparent", fontSize: 12 }}>
              <Edit2 size={12} /> Edit
            </Button>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: "Jobs", value: jobs.length, color: "#0ea5e9" },
            { label: "Estimates", value: estimates.length, color: "#f59e0b" },
            { label: "Job Value", value: `$${totalJobValue.toLocaleString()}`, color: "#5cbf00" },
            { label: "Collected", value: `$${totalPaid.toLocaleString()}`, color: "#8b5cf6" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg p-3 text-center"
              style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
              <div className="font-bold" style={{ fontSize: 18, color }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap" style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: 0 }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all relative"
            style={{
              color: tab === key ? "var(--color-green)" : "var(--color-muted)",
              borderBottom: tab === key ? "2px solid var(--color-green)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            <Icon size={13} />
            {label}
            {counts[key] > 0 && (
              <span className="rounded-full px-1.5 py-0.5" style={{
                fontSize: 10, background: tab === key ? "var(--color-green)" : "var(--color-border)",
                color: tab === key ? "#000" : "var(--color-muted)", fontWeight: 700, minWidth: 18, textAlign: "center",
              }}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW tab ────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Section title="LEAD DETAILS">
            <div className="space-y-0">
              {[
                ["Source", lead.source],
                ["Roof Type", lead.roofType || "—"],
                ["Roof Age", lead.roofAge ? `${lead.roofAge} years` : "—"],
                ["Insurance Claim", lead.insuranceClaim ? "Yes" : "No"],
                lead.insuranceClaim && ["Insurance Co.", lead.insuranceCompany || "—"],
                lead.insuranceClaim && ["Claim #", lead.claimNumber || "—"],
                ["Follow-up Date", lead.followUpDate || "—"],
              ].filter(Boolean).map(([k, v]: any) => (
                <div key={k} className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <span style={{ fontSize: 12, color: "var(--color-muted)" }}>{k}</span>
                  <span style={{ fontSize: 13, color: "var(--color-text)", textTransform: "capitalize" }}>{v}</span>
                </div>
              ))}
            </div>
            {lead.notes && (
              <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.04)", color: "var(--color-text)" }}>
                {lead.notes}
              </div>
            )}
            <div className="mt-4">
              <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em" }}>PIPELINE STATUS</div>
              <div className="flex gap-2 flex-wrap">
                {["new", "contacted", "inspected", "quoted", "won", "lost"].map(s => (
                  <button key={s} onClick={() => statusMutation.mutate(s)}
                    className="px-2.5 py-1 rounded text-xs font-medium transition-all capitalize"
                    style={{
                      background: lead.status === s ? "var(--color-green-dim)" : "rgba(255,255,255,0.04)",
                      color: lead.status === s ? "var(--color-green)" : "var(--color-muted)",
                      border: `1px solid ${lead.status === s ? "var(--color-green)" : "var(--color-border)"}`,
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section title="EMAIL AUTOMATION">
            <div className="space-y-2 mb-4">
              {["welcome", "follow-up", "storm-alert", "appointment"].map(t => (
                <button key={t} onClick={() => emailMutation.mutate(t)} disabled={emailMutation.isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--color-border)" }}>
                  <Send size={13} style={{ color: "var(--color-green)" }} />
                  <div>
                    <div className="font-medium capitalize" style={{ fontSize: 13, color: "var(--color-text)" }}>{t.replace("-", " ")} Email</div>
                    <div style={{ fontSize: 11, color: "var(--color-muted)" }}>Send to {lead.email}</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 6, fontWeight: 600, letterSpacing: "0.05em" }}>RECENT EMAILS ({emails.length})</div>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {emails.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--color-muted)" }}>No emails sent yet</div>
              ) : emails.slice(0, 6).map((e: any) => (
                <div key={e.id} className="flex items-center gap-2 text-xs" style={{ color: "var(--color-muted)" }}>
                  <Clock size={11} />
                  <span className="capitalize">{e.type}</span>
                  <span>—</span>
                  <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                  <span className="ml-auto" style={{ color: e.status === "sent" ? "#5cbf00" : "#ef4444" }}>{e.status}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── MEASUREMENTS tab ────────────────────────────────────────────────── */}
      {tab === "measurements" && (
        <Section title="ROOF MEASUREMENTS" action={
          <Link href="/measurements">
            <a className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-green)" }}>
              <Plus size={12} /> New Measurement
            </a>
          </Link>
        }>
          {/* PDF Report Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleReportUpload(f); }}
            onClick={() => reportInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg cursor-pointer transition-all mb-4"
            style={{
              border: `2px dashed ${dragOver ? "var(--color-green)" : "var(--color-border)"}`,
              background: dragOver ? "rgba(92,191,0,0.06)" : "rgba(255,255,255,0.02)",
              padding: "20px 16px",
              opacity: reportUploading ? 0.6 : 1,
            }}
          >
            <input ref={reportInputRef} type="file" accept="application/pdf,.pdf,text/xml,application/xml,.xml" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleReportUpload(f); e.target.value = ""; }} />
            <Upload size={20} style={{ color: dragOver ? "var(--color-green)" : "var(--color-muted)" }} />
            {reportUploading ? (
              <span style={{ fontSize: 13, color: "var(--color-green)", fontWeight: 600 }}>Extracting measurements…</span>
            ) : (
              <>
                <span style={{ fontSize: 13, color: dragOver ? "var(--color-green)" : "var(--color-text)", fontWeight: 600 }}>
                  Drop PDF report here or click to upload
                </span>
                <span style={{ fontSize: 11, color: "var(--color-muted)" }}>
                  PDF or XML — EagleView · GAF QuickMeasure · Roofr · Nearmap · HOVER · CoreLogic SkyMeasure
                </span>
              </>
            )}
          </div>

          {measurements.length === 0 ? (
            <div className="py-6 text-center">
              <Ruler size={24} className="mx-auto mb-2 opacity-30" style={{ color: "var(--color-muted)" }} />
              <p style={{ fontSize: 13, color: "var(--color-muted)" }}>No measurements yet. Drop a PDF report above or run a satellite measurement.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {measurements.map((m: any) => {
                const srcColor = SOURCE_COLORS[m.source] || "#8a9099";
                const srcLabel = SOURCE_LABELS[m.source] || m.source;
                return (
                  <div key={m.id} className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)" }}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span style={{ fontSize: 13, color: "var(--color-text)", fontWeight: 600 }}>{m.address}</span>
                      <span className="cw-badge flex-shrink-0" style={{ color: srcColor, background: `${srcColor}20`, fontSize: 10 }}>{srcLabel}</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {[
                        ["Squares", m.squares],
                        ["Total Area", m.totalArea ? `${m.totalArea.toLocaleString()} ft²` : "—"],
                        ["Pitch", m.pitch || "—"],
                        ["Facets", m.facets || "—"],
                        ["Ridge", m.ridgeLength ? `${m.ridgeLength} ft` : "—"],
                        ["Eave", m.eaveLength ? `${m.eaveLength} ft` : "—"],
                      ].map(([label, value]) => (
                        <div key={label as string} className="text-center">
                          <div className="font-bold" style={{ fontSize: 15, color: "var(--color-text)" }}>{value}</div>
                          <div style={{ fontSize: 10, color: "var(--color-muted)" }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    {m.reportUrl && (
                      <a href={m.reportUrl} target="_blank" rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs"
                        style={{ color: "#5cbf00" }}>
                        <ExternalLink size={11} /> View Full Report
                      </a>
                    )}
                    <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 8 }}>
                      {new Date(m.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* ── ESTIMATES tab ───────────────────────────────────────────────────── */}
      {tab === "estimates" && (
        <Section title="ESTIMATES" action={
          <Link href="/estimates">
            <a className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-green)" }}>
              <Plus size={12} /> New Estimate
            </a>
          </Link>
        }>
          {estimates.length === 0 ? (
            <div className="py-8 text-center">
              <FileText size={28} className="mx-auto mb-3 opacity-30" style={{ color: "var(--color-muted)" }} />
              <p style={{ fontSize: 13, color: "var(--color-muted)" }}>No estimates yet for this lead.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Estimate #</th><th>Status</th><th>Squares</th><th>Materials</th><th>Labor</th><th>Total</th><th>Created</th><th>Portal</th></tr></thead>
                <tbody>
                  {estimates.map((e: any) => (
                    <tr key={e.id}>
                      <td style={{ color: "var(--color-green)", fontSize: 13, fontWeight: 600 }}>{e.estimateNumber}</td>
                      <td><StatusBadge status={e.status} /></td>
                      <td style={td}>{e.roofSquares || "—"}</td>
                      <td style={tdMuted}>{e.materialCost ? `$${e.materialCost.toLocaleString()}` : "—"}</td>
                      <td style={tdMuted}>{e.laborCost ? `$${e.laborCost.toLocaleString()}` : "—"}</td>
                      <td style={{ ...td, fontWeight: 700, color: "#5cbf00" }}>{e.totalAmount ? `$${e.totalAmount.toLocaleString()}` : "—"}</td>
                      <td style={tdMuted}>{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "—"}</td>
                      <td>
                        <a href={`/#/portal/${e.id}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs" style={{ color: "#0ea5e9" }}>
                          <Eye size={11} /> Portal
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* ── JOBS tab ────────────────────────────────────────────────────────── */}
      {tab === "jobs" && (
        <Section title="JOBS & SCHEDULING" action={
          <Link href="/jobs">
            <a className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-green)" }}>
              <Plus size={12} /> New Job
            </a>
          </Link>
        }>
          {jobs.length === 0 ? (
            <div className="py-8 text-center">
              <Briefcase size={28} className="mx-auto mb-3 opacity-30" style={{ color: "var(--color-muted)" }} />
              <p style={{ fontSize: 13, color: "var(--color-muted)" }}>No jobs yet for this lead.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Job #</th><th>Type</th><th>Status</th><th>Crew Lead</th><th>Scheduled</th><th>Completed</th><th>Total</th><th>Deposit</th></tr></thead>
                <tbody>
                  {jobs.map((j: any) => (
                    <tr key={j.id}>
                      <td style={{ color: "var(--color-green)", fontWeight: 600, fontSize: 13 }}>{j.jobNumber}</td>
                      <td style={{ ...td, textTransform: "capitalize" }}>{j.jobType?.replace(/-/g, " ") || "—"}</td>
                      <td><StatusBadge status={j.status} /></td>
                      <td style={tdMuted}>{j.crewLead || "—"}</td>
                      <td style={tdMuted}>{j.scheduledDate || "—"}</td>
                      <td style={tdMuted}>{j.completedDate || "—"}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{j.totalAmount ? `$${j.totalAmount.toLocaleString()}` : "—"}</td>
                      <td>
                        {j.depositPaid
                          ? <span className="cw-badge" style={{ color: "#5cbf00", background: "rgba(92,191,0,0.12)" }}>Paid</span>
                          : <span className="cw-badge" style={{ color: "#f59e0b", background: "rgba(245,158,11,0.12)" }}>Pending</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* ── INSURANCE tab ───────────────────────────────────────────────────── */}
      {tab === "insurance" && (
        <Section title="INSURANCE CLAIMS" action={
          <Link href="/insurance-claims">
            <a className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-green)" }}>
              <Plus size={12} /> New Claim
            </a>
          </Link>
        }>
          {insuranceClaims.length === 0 ? (
            <div className="py-8 text-center">
              <ShieldCheck size={28} className="mx-auto mb-3 opacity-30" style={{ color: "var(--color-muted)" }} />
              <p style={{ fontSize: 13, color: "var(--color-muted)" }}>No insurance claims on file.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insuranceClaims.map((c: any) => (
                <div key={c.id} className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>{c.carrier}</div>
                      <div style={{ fontSize: 12, color: "var(--color-muted)" }}>Claim # {c.claimNumber || "—"} | Policy # {c.policyNumber || "—"}</div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      ["Initial Amount", c.initialAmount ? `$${c.initialAmount.toLocaleString()}` : "—"],
                      ["Approved Amount", c.approvedAmount ? `$${c.approvedAmount.toLocaleString()}` : "—"],
                      ["Adjuster", c.adjusterName || "—"],
                      ["Check Status", c.checkEndorsementStatus || "—"],
                    ].map(([k, v]) => (
                      <div key={k as string}>
                        <div style={{ fontSize: 10, color: "var(--color-muted)" }}>{k}</div>
                        <div style={{ fontSize: 13, color: "var(--color-text)", fontWeight: 600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {c.mortgageCompany && (
                    <div className="mt-2" style={{ fontSize: 12, color: "var(--color-muted)" }}>
                      Mortgage Co: <span style={{ color: "var(--color-text)" }}>{c.mortgageCompany}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── CONTRACTS tab ───────────────────────────────────────────────────── */}
      {tab === "contracts" && (
        <Section title="CONTRACTS" action={
          <Link href="/contracts">
            <a className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-green)" }}>
              <Plus size={12} /> New Contract
            </a>
          </Link>
        }>
          {contracts.length === 0 ? (
            <div className="py-8 text-center">
              <FileSignature size={28} className="mx-auto mb-3 opacity-30" style={{ color: "var(--color-muted)" }} />
              <p style={{ fontSize: 13, color: "var(--color-muted)" }}>No contracts yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Contract #</th><th>Homeowner</th><th>Status</th><th>Amount</th><th>Sent</th><th>Signed</th></tr></thead>
                <tbody>
                  {contracts.map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ color: "var(--color-green)", fontWeight: 600, fontSize: 13 }}>{c.contractNumber}</td>
                      <td style={td}>{c.homeownerName || "—"}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td style={{ ...td, fontWeight: 700 }}>{c.totalAmount ? `$${c.totalAmount.toLocaleString()}` : "—"}</td>
                      <td style={tdMuted}>{c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "—"}</td>
                      <td style={{ color: c.signedAt ? "#5cbf00" : "var(--color-muted)", fontSize: 12 }}>
                        {c.signedAt ? new Date(c.signedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* ── PAYMENTS tab ────────────────────────────────────────────────────── */}
      {tab === "payments" && (
        <Section title="PAYMENTS" action={
          <Link href="/payments">
            <a className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-green)" }}>
              <Plus size={12} /> Record Payment
            </a>
          </Link>
        }>
          {payments.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Total Collected", value: `$${payments.filter((p: any) => p.paymentType !== "refund").reduce((s: number, p: any) => s + p.amount, 0).toLocaleString()}`, color: "#5cbf00" },
                { label: "Deposits", value: `$${payments.filter((p: any) => p.paymentType === "deposit").reduce((s: number, p: any) => s + p.amount, 0).toLocaleString()}`, color: "#0ea5e9" },
                { label: "Final Payments", value: `$${payments.filter((p: any) => p.paymentType === "final").reduce((s: number, p: any) => s + p.amount, 0).toLocaleString()}`, color: "#8b5cf6" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg p-3 text-center" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
                  <div className="font-bold" style={{ fontSize: 16, color }}>{value}</div>
                  <div style={{ fontSize: 10, color: "var(--color-muted)" }}>{label}</div>
                </div>
              ))}
            </div>
          )}
          {payments.length === 0 ? (
            <div className="py-8 text-center">
              <DollarSign size={28} className="mx-auto mb-3 opacity-30" style={{ color: "var(--color-muted)" }} />
              <p style={{ fontSize: 13, color: "var(--color-muted)" }}>No payments recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Type</th><th>Method</th><th>Amount</th><th>Reference #</th><th>Notes</th></tr></thead>
                <tbody>
                  {payments.map((p: any) => (
                    <tr key={p.id}>
                      <td style={tdMuted}>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}</td>
                      <td><span className="cw-badge capitalize" style={{ color: "#0ea5e9", background: "rgba(14,165,233,0.12)" }}>{p.paymentType}</span></td>
                      <td style={{ ...td, textTransform: "capitalize" }}>{p.method || "—"}</td>
                      <td style={{ ...td, fontWeight: 700, color: p.paymentType === "refund" ? "#ef4444" : "#5cbf00" }}>
                        {p.paymentType === "refund" ? "-" : ""}${p.amount?.toLocaleString()}
                      </td>
                      <td style={tdMuted}>{p.referenceNumber || "—"}</td>
                      <td style={tdMuted}>{p.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* ── DOCUMENTS tab ───────────────────────────────────────────────────── */}
      {tab === "documents" && (
        <Section title="DOCUMENTS" action={
          <button onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: "var(--color-green)", color: "#000" }}>
            <Upload size={12} /> Upload Document
          </button>
        }>
          {documents.length === 0 ? (
            <div className="py-10 text-center">
              <FolderOpen size={32} className="mx-auto mb-3 opacity-30" style={{ color: "var(--color-muted)" }} />
              <p style={{ fontSize: 13, color: "var(--color-muted)" }}>No documents uploaded yet.</p>
              <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>
                Upload declarations pages, adjuster reports, permits, insurance determination letters, and more.
              </p>
              <button onClick={() => setUploadOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg"
                style={{ background: "var(--color-green)", color: "#000" }}>
                <Upload size={12} /> Upload First Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-start gap-3 rounded-lg p-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${DOC_TYPE_COLORS[doc.docType] || "#6b7280"}22` }}>
                    <FileText size={16} style={{ color: DOC_TYPE_COLORS[doc.docType] || "#6b7280" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div style={{ fontSize: 13, color: "var(--color-text)", fontWeight: 600, wordBreak: "break-all" }}>
                        {doc.originalName}
                      </div>
                      <DocTypeBadge type={doc.docType} />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span style={{ fontSize: 11, color: "var(--color-muted)" }}>{formatBytes(doc.size)}</span>
                      <span style={{ fontSize: 11, color: "var(--color-muted)" }}>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {doc.notes && (
                      <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4, fontStyle: "italic" }}>{doc.notes}</div>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        download={doc.originalName}
                        className="flex items-center gap-1 text-xs hover:opacity-80"
                        style={{ color: "#0ea5e9" }}>
                        <Download size={11} /> Download
                      </a>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs hover:opacity-80"
                        style={{ color: "var(--color-muted)" }}>
                        <Eye size={11} /> View
                      </a>
                      <button onClick={() => deleteDocMutation.mutate(doc.id)}
                        className="flex items-center gap-1 text-xs hover:opacity-80 ml-auto"
                        style={{ color: "#ef4444" }}>
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── EMAILS tab ──────────────────────────────────────────────────────── */}
      {tab === "emails" && (
        <Section title="EMAIL AUTOMATION">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {["welcome", "follow-up", "storm-alert", "appointment"].map(t => (
              <button key={t} onClick={() => emailMutation.mutate(t)} disabled={emailMutation.isPending}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--color-border)" }}>
                <Send size={14} style={{ color: "var(--color-green)" }} />
                <div>
                  <div className="font-medium capitalize" style={{ fontSize: 13, color: "var(--color-text)" }}>{t.replace("-", " ")} Email</div>
                  <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{lead.email}</div>
                </div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em" }}>
            EMAIL HISTORY ({emails.length})
          </div>
          <div className="overflow-x-auto">
            {emails.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--color-muted)" }}>No emails sent yet.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Type</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {emails.map((e: any) => (
                    <tr key={e.id}>
                      <td style={{ ...td, textTransform: "capitalize" }}>{e.type}</td>
                      <td><span style={{ color: e.status === "sent" ? "#5cbf00" : "#ef4444", fontSize: 12 }}>{e.status}</span></td>
                      <td style={tdMuted}>{new Date(e.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Section>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          <DialogHeader>
            <DialogTitle className="font-display font-bold" style={{ color: "var(--color-text)", fontSize: 20 }}>EDIT LEAD</DialogTitle>
          </DialogHeader>
          <LeadForm onClose={() => setEditOpen(false)} existing={lead} />
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      <DocumentUploadDialog
        leadId={Number(id)}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />
    </div>
  );
}
