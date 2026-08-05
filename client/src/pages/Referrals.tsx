import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, TrendingUp, Star, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SOURCE_TYPES = ["canvass", "referral", "website", "nextdoor", "google", "facebook", "yard-sign", "other"] as const;
type SourceType = typeof SOURCE_TYPES[number];

const TYPE_COLORS: Record<SourceType, string> = {
  canvass: "#f97316",
  referral: "#22c55e",
  website: "#3b82f6",
  nextdoor: "#a855f7",
  google: "#f59e0b",
  facebook: "#1d4ed8",
  "yard-sign": "#ef4444",
  other: "#8a9099",
};

const LEAD_SOURCE_LABELS: Record<string, string> = {
  canvass: "Canvass",
  referral: "Referral",
  website: "Website",
  nextdoor: "Nextdoor",
  google: "Google",
  facebook: "Facebook",
  "yard-sign": "Yard Sign",
  other: "Other",
  "": "Unknown",
};

interface SourceFormData {
  name: string;
  type: SourceType;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  active: boolean;
  notes: string;
}

const EMPTY_FORM: SourceFormData = {
  name: "",
  type: "referral",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  active: true,
  notes: "",
};

function SourceForm({
  onClose,
  initial,
  onSubmit,
  isPending,
}: {
  onClose: () => void;
  initial: SourceFormData;
  onSubmit: (data: SourceFormData) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<SourceFormData>(initial);
  const set = (k: keyof SourceFormData, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSubmit(form); }}
      className="space-y-4"
    >
      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>SOURCE NAME *</Label>
        <Input
          value={form.name}
          onChange={e => set("name", e.target.value)}
          required
          placeholder="e.g. John Smith Referral, Google Ads, Spring Canvass 2024"
          className="mt-1"
          style={{ background: "var(--color-surface-2, #1a2030)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
        />
      </div>

      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>TYPE *</Label>
        <Select value={form.type} onValueChange={v => set("type", v as SourceType)}>
          <SelectTrigger className="mt-1" style={{ background: "var(--color-surface-2, #1a2030)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            {SOURCE_TYPES.map(t => (
              <SelectItem key={t} value={t} style={{ color: "var(--color-text)", textTransform: "capitalize" }}>
                {t.replace(/-/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>CONTACT NAME</Label>
          <Input
            value={form.contactName}
            onChange={e => set("contactName", e.target.value)}
            className="mt-1"
            style={{ background: "var(--color-surface-2, #1a2030)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>CONTACT PHONE</Label>
          <Input
            value={form.contactPhone}
            onChange={e => set("contactPhone", e.target.value)}
            className="mt-1"
            style={{ background: "var(--color-surface-2, #1a2030)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
        </div>
      </div>

      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>CONTACT EMAIL</Label>
        <Input
          type="email"
          value={form.contactEmail}
          onChange={e => set("contactEmail", e.target.value)}
          className="mt-1"
          style={{ background: "var(--color-surface-2, #1a2030)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="source-active"
          checked={form.active}
          onChange={e => set("active", e.target.checked)}
          className="w-4 h-4 rounded"
          style={{ accentColor: "var(--color-green)" }}
        />
        <label htmlFor="source-active" style={{ fontSize: 13, color: "var(--color-text)", cursor: "pointer" }}>
          Active
        </label>
      </div>

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
        <Button type="button" variant="outline" onClick={onClose} className="flex-1"
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent" }}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="flex-1 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}>
          {isPending ? "Saving..." : "Save Source"}
        </Button>
      </div>
    </form>
  );
}

export default function Referrals() {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const { data: sources = [], isLoading: loadingSources } = useQuery({
    queryKey: ["/api/referral-sources"],
    queryFn: () => apiRequest("GET", "/api/referral-sources").then(r => r.json()),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
    queryFn: () => apiRequest("GET", "/api/leads").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/referral-sources", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral-sources"] });
      toast({ title: "Source added" });
      setShowAdd(false);
    },
    onError: () => toast({ title: "Failed to add source", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/referral-sources/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral-sources"] });
      toast({ title: "Source updated" });
      setEditTarget(null);
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/referral-sources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral-sources"] });
      toast({ title: "Source deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  // Lead source breakdown
  const sourceCounts: Record<string, number> = {};
  leads.forEach((l: any) => {
    const s = l.source || "other";
    sourceCounts[s] = (sourceCounts[s] || 0) + 1;
  });
  const sortedSources = Object.entries(sourceCounts).sort(([, a], [, b]) => b - a);
  const maxCount = sortedSources[0]?.[1] || 1;
  const totalLeads = leads.length;

  // Stats
  const totalSources = sources.length;
  const activeSources = sources.filter((s: any) => s.active).length;
  const topSource = sortedSources[0]?.[0];
  const referralLeads = leads.filter((l: any) => l.source === "referral").length;
  const conversionRate = totalLeads > 0 ? Math.round((leads.filter((l: any) => l.status === "approved" || l.status === "closed").length / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white" style={{ fontSize: 26 }}>REFERRAL SOURCES</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Track where your leads come from</p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}
        >
          <Plus size={15} /> Add Source
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Sources", value: totalSources, color: "#8a9099" },
          { label: "Active Sources", value: activeSources, color: "var(--color-green)" },
          { label: "Total Leads", value: totalLeads, color: "#3b82f6" },
          { label: "Conversion Rate", value: `${conversionRate}%`, color: "#f59e0b" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="font-display font-bold" style={{ fontSize: 26, color }}>{value}</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Lead Source Breakdown (bar chart) */}
      {sortedSources.length > 0 && (
        <div className="section-panel p-5">
          <div className="font-display font-bold text-white mb-4" style={{ fontSize: 14 }}>
            LEAD SOURCE BREAKDOWN
          </div>
          <div className="space-y-3">
            {sortedSources.map(([source, count]) => {
              const color = TYPE_COLORS[source as SourceType] ?? "#8a9099";
              const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
              const barWidth = Math.round((count / maxCount) * 100);
              return (
                <div key={source} className="flex items-center gap-3">
                  <div style={{ width: 110, fontSize: 12, color: "var(--color-text)", flexShrink: 0 }}>
                    {LEAD_SOURCE_LABELS[source] || source}
                  </div>
                  <div className="flex-1 relative h-6 rounded overflow-hidden" style={{ background: "var(--color-border)" }}>
                    <div
                      className="h-full rounded transition-all"
                      style={{ width: `${barWidth}%`, background: color, opacity: 0.85 }}
                    />
                  </div>
                  <div style={{ width: 60, fontSize: 12, color: "var(--color-muted)", textAlign: "right", flexShrink: 0 }}>
                    {count} ({pct}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Referral Sources Table */}
      <div className="section-panel overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="font-display font-bold text-white" style={{ fontSize: 14 }}>MANAGED SOURCES</div>
        </div>
        {loadingSources ? (
          <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Loading...</div>
        ) : sources.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={40} style={{ color: "var(--color-muted)", margin: "0 auto 12px" }} />
            <div style={{ color: "var(--color-text)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No sources yet</div>
            <div style={{ color: "var(--color-muted)", fontSize: 13 }}>Add referral sources to track where your leads come from</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Phone / Email</th>
                  <th># Leads</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((src: any) => {
                  const color = TYPE_COLORS[src.type as SourceType] ?? "#8a9099";
                  // Count leads matching this source by name (approximate)
                  const leadCount = leads.filter((l: any) => l.referralSourceId === src.id).length;
                  return (
                    <tr key={src.id}>
                      <td style={{ fontWeight: 600, color: "var(--color-text)", fontSize: 13 }}>{src.name}</td>
                      <td>
                        <span className="cw-badge" style={{ color, background: `${color}20`, textTransform: "capitalize" }}>
                          {(src.type || "other").replace(/-/g, " ")}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--color-text)" }}>{src.contactName || "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--color-muted)" }}>
                        {src.contactPhone && <div>{src.contactPhone}</div>}
                        {src.contactEmail && <div>{src.contactEmail}</div>}
                        {!src.contactPhone && !src.contactEmail && "—"}
                      </td>
                      <td style={{ fontSize: 13, color: "var(--color-text)", textAlign: "center" }}>{leadCount}</td>
                      <td>
                        <span
                          className="cw-badge"
                          style={{
                            color: src.active ? "var(--color-green)" : "var(--color-muted)",
                            background: src.active ? "var(--color-green-dim)" : "rgba(138,144,153,0.1)",
                          }}
                        >
                          {src.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditTarget(src)}
                            style={{ color: "var(--color-muted)", cursor: "pointer" }}
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Delete this source?")) deleteMutation.mutate(src.id);
                            }}
                            style={{ color: "#ef4444", cursor: "pointer" }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        >
          <DialogHeader>
            <DialogTitle className="font-display font-bold flex items-center gap-2" style={{ color: "var(--color-text)", fontSize: 20 }}>
              <TrendingUp size={18} style={{ color: "var(--color-green)" }} /> ADD REFERRAL SOURCE
            </DialogTitle>
          </DialogHeader>
          <SourceForm
            initial={EMPTY_FORM}
            onClose={() => setShowAdd(false)}
            onSubmit={data => createMutation.mutate(data)}
            isPending={createMutation.isPending}
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
              <Edit2 size={18} style={{ color: "var(--color-green)" }} /> EDIT SOURCE
            </DialogTitle>
          </DialogHeader>
          {editTarget && (
            <SourceForm
              initial={{
                name: editTarget.name || "",
                type: editTarget.type || "referral",
                contactName: editTarget.contactName || "",
                contactPhone: editTarget.contactPhone || "",
                contactEmail: editTarget.contactEmail || "",
                active: editTarget.active !== false,
                notes: editTarget.notes || "",
              }}
              onClose={() => setEditTarget(null)}
              onSubmit={data => updateMutation.mutate({ id: editTarget.id, data })}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
