import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Plus, Camera, FolderOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DAMAGE_COLORS: Record<string, string> = {
  none: "#22c55e", minor: "#f59e0b", moderate: "#f97316", severe: "#ef4444", unknown: "#8a9099",
};

function ProjectForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", address: "", type: "inspection", notes: "" });
  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
    queryFn: () => apiRequest("GET", "/api/leads").then(r => r.json()),
  });
  const [leadId, setLeadId] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/projects", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Project created" });
      onClose();
    },
  });

  return (
    <form onSubmit={e => {
      e.preventDefault();
      mutation.mutate({ ...form, leadId: leadId ? Number(leadId) : undefined });
    }} className="space-y-4">
      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>PROJECT NAME *</Label>
        <Input data-testid="input-proj-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
          className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
      </div>
      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>PROPERTY ADDRESS *</Label>
        <div className="mt-1">
          <AddressAutocomplete
            data-testid="input-proj-address"
            value={form.address}
            onChange={v => setForm(f => ({ ...f, address: v }))}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>REPORT TYPE</Label>
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
            <SelectTrigger className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {["inspection", "damage-assessment", "progress", "completion"].map(t =>
                <SelectItem key={t} value={t} style={{ color: "var(--color-text)", textTransform: "capitalize" }}>
                  {t.replace(/-/g, " ")}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>LINKED LEAD (OPTIONAL)</Label>
          <Select value={leadId} onValueChange={setLeadId}>
            <SelectTrigger className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue placeholder="Select lead..." />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {leads.map((l: any) => (
                <SelectItem key={l.id} value={String(l.id)} style={{ color: "var(--color-text)" }}>
                  {l.firstName} {l.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>NOTES</Label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
          className="w-full mt-1 rounded-md px-3 py-2 text-sm resize-none"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)", outline: "none" }} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1"
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent" }}>Cancel</Button>
        <Button data-testid="button-create-project" type="submit" className="flex-1 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }} disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </form>
  );
}

export default function PhotoProjects() {
  const [showForm, setShowForm] = useState(false);
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => apiRequest("GET", "/api/projects").then(r => r.json()),
  });

  const typeColors: Record<string, string> = {
    inspection: "#0ea5e9",
    "damage-assessment": "#ef4444",
    progress: "#f59e0b",
    completion: "#22c55e",
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white" style={{ fontSize: 26 }}>PHOTO REPORTS</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>AI-powered damage documentation</p>
        </div>
        <Button data-testid="button-new-project" onClick={() => setShowForm(true)}
          className="flex items-center gap-2 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}>
          <Plus size={15} /> New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Loading...</div>
      ) : projects.length === 0 ? (
        <div className="section-panel p-12 text-center">
          <Camera size={48} style={{ color: "var(--color-muted)", margin: "0 auto 16px" }} />
          <div style={{ color: "var(--color-text)", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No photo projects</div>
          <div style={{ color: "var(--color-muted)", fontSize: 13, marginBottom: 20 }}>
            Create a project, upload field photos, and get AI damage descriptions instantly
          </div>
          <Button onClick={() => setShowForm(true)} className="font-semibold"
            style={{ background: "var(--color-green)", color: "#0a1500" }}>
            <Plus size={14} className="mr-1.5" /> Create First Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((proj: any) => {
            const color = typeColors[proj.type] || "#8a9099";
            return (
              <Link key={proj.id} href={`/photo-projects/${proj.id}`}>
                <a
                  data-testid={`card-project-${proj.id}`}
                  className="section-panel p-5 flex flex-col gap-3 hover:border-opacity-80 transition-all cursor-pointer"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `${color}22`, color }}
                    >
                      <Camera size={18} />
                    </div>
                    <span className="cw-badge" style={{ color, background: `${color}20`, textTransform: "capitalize" }}>
                      {proj.type.replace(/-/g, " ")}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold" style={{ fontSize: 14, color: "var(--color-text)" }}>{proj.name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>{proj.address}</div>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span style={{ fontSize: 11, color: "var(--color-muted)" }}>
                      {proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : ""}
                    </span>
                    <span style={{ color: "var(--color-green)", fontSize: 12 }} className="flex items-center gap-1">
                      View <ChevronRight size={13} />
                    </span>
                  </div>
                </a>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          <DialogHeader>
            <DialogTitle className="font-display font-bold flex items-center gap-2" style={{ color: "var(--color-text)", fontSize: 20 }}>
              <Camera size={18} style={{ color: "var(--color-green)" }} /> NEW PHOTO PROJECT
            </DialogTitle>
          </DialogHeader>
          <ProjectForm onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
