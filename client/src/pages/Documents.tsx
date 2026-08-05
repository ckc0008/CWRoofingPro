import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, API_BASE } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Image, File, Plus, Download, Trash2, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DOC_TYPES = ["declarations", "adjuster-report", "permit", "contract", "warranty", "photo", "invoice", "other"] as const;
type DocType = typeof DOC_TYPES[number];

const TYPE_COLORS: Record<DocType, string> = {
  declarations: "#3b82f6",
  "adjuster-report": "#f59e0b",
  permit: "#f97316",
  contract: "#22c55e",
  warranty: "#a855f7",
  photo: "#8a9099",
  invoice: "#06b6d4",
  other: "#8a9099",
};

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocTypeIcon({ type }: { type: string }) {
  if (type === "photo") return <Image size={22} />;
  if (["declarations", "adjuster-report", "contract", "warranty", "invoice"].includes(type))
    return <FileText size={22} />;
  return <File size={22} />;
}

function UploadDialog({ onClose, leads, jobs }: { onClose: () => void; leads: any[]; jobs: any[] }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>("declarations");
  const [leadId, setLeadId] = useState("");
  const [jobId, setJobId] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast({ title: "Please select a file", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", docType);
      if (leadId) formData.append("leadId", leadId);
      if (jobId) formData.append("jobId", jobId);
      if (notes) formData.append("notes", notes);

      const res = await fetch(`${API_BASE}/api/documents/upload`, { method: "POST", body: formData });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document uploaded successfully" });
      onClose();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  }

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>FILE *</Label>
        <input
          ref={fileRef}
          type="file"
          required
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="w-full mt-1 text-sm rounded-md px-3 py-2 cursor-pointer"
          style={{
            background: "var(--color-surface-2, #1a2030)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
          }}
        />
        {file && (
          <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4 }}>
            {file.name} — {formatBytes(file.size)}
          </div>
        )}
      </div>

      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>DOCUMENT TYPE *</Label>
        <Select value={docType} onValueChange={v => setDocType(v as DocType)}>
          <SelectTrigger className="mt-1" style={{ background: "var(--color-surface-2, #1a2030)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            {DOC_TYPES.map(t => (
              <SelectItem key={t} value={t} style={{ color: "var(--color-text)", textTransform: "capitalize" }}>
                {t.replace(/-/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>ASSOCIATE WITH LEAD</Label>
          <Select value={leadId} onValueChange={setLeadId}>
            <SelectTrigger className="mt-1" style={{ background: "var(--color-surface-2, #1a2030)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue placeholder="Optional..." />
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
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>ASSOCIATE WITH JOB</Label>
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger className="mt-1" style={{ background: "var(--color-surface-2, #1a2030)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue placeholder="Optional..." />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <SelectItem value="none" style={{ color: "var(--color-muted)" }}>None</SelectItem>
              {jobs.map((j: any) => (
                <SelectItem key={j.id} value={String(j.id)} style={{ color: "var(--color-text)" }}>
                  Job #{j.jobNumber || j.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>NOTES</Label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Additional notes about this document..."
          className="w-full mt-1 rounded-md px-3 py-2 text-sm resize-none"
          style={{ background: "var(--color-surface-2, #1a2030)", border: "1px solid var(--color-border)", color: "var(--color-text)", outline: "none" }}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1"
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent" }}>
          Cancel
        </Button>
        <Button type="submit" disabled={uploading} className="flex-1 font-semibold flex items-center gap-2"
          style={{ background: "var(--color-green)", color: "#0a1500" }}>
          <Upload size={14} />
          {uploading ? "Uploading..." : "Upload Document"}
        </Button>
      </div>
    </form>
  );
}

export default function Documents() {
  const { toast } = useToast();
  const [showUpload, setShowUpload] = useState(false);
  const [filterLead, setFilterLead] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: () => apiRequest("GET", "/api/documents").then(r => r.json()),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
    queryFn: () => apiRequest("GET", "/api/leads").then(r => r.json()),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["/api/jobs"],
    queryFn: () => apiRequest("GET", "/api/jobs").then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document deleted" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const leadMap = Object.fromEntries(leads.map((l: any) => [l.id, `${l.firstName} ${l.lastName}`]));
  const jobMap = Object.fromEntries(jobs.map((j: any) => [j.id, `Job #${j.jobNumber || j.id}`]));

  const filtered = documents.filter((doc: any) => {
    if (filterLead !== "all" && String(doc.leadId) !== filterLead) return false;
    if (filterType !== "all" && doc.docType !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white" style={{ fontSize: 26 }}>DOCUMENT STORAGE</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Upload and manage job documents</p>
        </div>
        <Button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}
        >
          <Plus size={15} /> Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Label style={{ color: "var(--color-muted)", fontSize: 11, whiteSpace: "nowrap" }}>LEAD:</Label>
          <Select value={filterLead} onValueChange={setFilterLead}>
            <SelectTrigger className="h-8 text-xs" style={{ width: 180, background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <SelectItem value="all" style={{ color: "var(--color-text)" }}>All Leads</SelectItem>
              {leads.map((l: any) => (
                <SelectItem key={l.id} value={String(l.id)} style={{ color: "var(--color-text)" }}>
                  {l.firstName} {l.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label style={{ color: "var(--color-muted)", fontSize: 11, whiteSpace: "nowrap" }}>TYPE:</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 text-xs" style={{ width: 160, background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <SelectItem value="all" style={{ color: "var(--color-text)" }}>All Types</SelectItem>
              {DOC_TYPES.map(t => (
                <SelectItem key={t} value={t} style={{ color: "var(--color-text)", textTransform: "capitalize" }}>
                  {t.replace(/-/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(filterLead !== "all" || filterType !== "all") && (
          <button
            onClick={() => { setFilterLead("all"); setFilterType("all"); }}
            style={{ fontSize: 12, color: "var(--color-muted)", textDecoration: "underline", cursor: "pointer" }}
          >
            Clear filters
          </button>
        )}
        <span style={{ fontSize: 12, color: "var(--color-muted)", alignSelf: "center" }}>
          {filtered.length} document{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Loading documents...</div>
      ) : filtered.length === 0 ? (
        <div className="section-panel p-12 text-center">
          <FileText size={48} style={{ color: "var(--color-muted)", margin: "0 auto 16px" }} />
          <div style={{ color: "var(--color-text)", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            No documents uploaded yet
          </div>
          <div style={{ color: "var(--color-muted)", fontSize: 13, marginBottom: 20 }}>
            Upload declarations pages, adjuster reports, permits, and more.
          </div>
          <Button
            onClick={() => setShowUpload(true)}
            className="font-semibold"
            style={{ background: "var(--color-green)", color: "#0a1500" }}
          >
            <Plus size={14} className="mr-1.5" /> Upload First Document
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((doc: any) => {
            const color = TYPE_COLORS[doc.docType as DocType] ?? "#8a9099";
            const leadName = doc.leadId ? leadMap[doc.leadId] : null;
            const jobName = doc.jobId ? jobMap[doc.jobId] : null;
            return (
              <div
                key={doc.id}
                className="section-panel p-4 flex flex-col gap-3"
                style={{ borderColor: "var(--color-border)" }}
              >
                {/* Icon + Type badge */}
                <div className="flex items-start justify-between">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}20`, color }}
                  >
                    <DocTypeIcon type={doc.docType} />
                  </div>
                  <span
                    className="cw-badge"
                    style={{ color, background: `${color}20`, textTransform: "capitalize", fontSize: 10 }}
                  >
                    {(doc.docType || "other").replace(/-/g, " ")}
                  </span>
                </div>

                {/* Filename */}
                <div>
                  <div className="font-semibold truncate" style={{ fontSize: 13, color: "var(--color-text)" }} title={doc.filename}>
                    {doc.filename || doc.originalName || "Untitled"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>
                    {formatBytes(doc.fileSize)}
                  </div>
                </div>

                {/* Associations */}
                <div className="space-y-1">
                  {leadName && (
                    <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
                      Lead: <span style={{ color: "var(--color-text)" }}>{leadName}</span>
                    </div>
                  )}
                  {jobName && (
                    <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
                      {jobName}
                    </div>
                  )}
                  {doc.createdAt && (
                    <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  {doc.url && (
                    <a
                      href={doc.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full flex items-center gap-1.5 text-xs"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text)", background: "transparent" }}
                      >
                        <Download size={12} /> Download
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    style={{ borderColor: "var(--color-border)", color: "#ef4444", background: "transparent" }}
                    onClick={() => {
                      if (confirm("Delete this document?")) deleteMutation.mutate(doc.id);
                    }}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        >
          <DialogHeader>
            <DialogTitle className="font-display font-bold flex items-center gap-2" style={{ color: "var(--color-text)", fontSize: 20 }}>
              <Upload size={18} style={{ color: "var(--color-green)" }} /> UPLOAD DOCUMENT
            </DialogTitle>
          </DialogHeader>
          <UploadDialog onClose={() => setShowUpload(false)} leads={leads} jobs={jobs} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
