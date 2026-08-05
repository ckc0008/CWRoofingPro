import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, API_BASE } from "@/lib/queryClient";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "./Dashboard";
import {
  Plus, Search, User, Phone, Mail, MapPin, Filter,
  ChevronRight, Trash2, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const STATUSES = ["new", "contacted", "inspected", "quoted", "won", "lost"];
const SOURCES = ["manual", "website", "referral", "storm-alert", "canvassing", "repeat"];

function LeadForm({ onClose, existing }: { onClose: () => void; existing?: any }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    firstName: existing?.firstName || "",
    lastName: existing?.lastName || "",
    email: existing?.email || "",
    phone: existing?.phone || "",
    address: existing?.address || "",
    city: existing?.city || "Houston",
    state: existing?.state || "TX",
    zip: existing?.zip || "",
    source: existing?.source || "manual",
    status: existing?.status || "new",
    notes: existing?.notes || "",
    assignedTo: existing?.assignedTo || "",
    roofAge: existing?.roofAge || "",
    roofType: existing?.roofType || "",
    insuranceClaim: existing?.insuranceClaim || false,
    insuranceCompany: existing?.insuranceCompany || "",
    claimNumber: existing?.claimNumber || "",
    followUpDate: existing?.followUpDate || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = existing ? `/api/leads/${existing.id}` : "/api/leads";
      const method = existing ? "PATCH" : "POST";
      const res = await fetch(`${API_BASE}${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: existing ? "Lead updated" : "Lead created", description: `${form.firstName} ${form.lastName}` });
      onClose();
    },
    onError: (err: any) => toast({ title: "Error saving lead", description: err.message, variant: "destructive" }),
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>FIRST NAME *</Label>
          <Input data-testid="input-firstName" value={form.firstName} onChange={e => set("firstName", e.target.value)} required
            className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>LAST NAME *</Label>
          <Input data-testid="input-lastName" value={form.lastName} onChange={e => set("lastName", e.target.value)} required
            className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>EMAIL</Label>
          <Input data-testid="input-email" type="email" value={form.email} onChange={e => set("email", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>PHONE</Label>
          <Input data-testid="input-phone" value={form.phone} onChange={e => set("phone", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
      </div>
      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>PROPERTY ADDRESS</Label>
        <Input data-testid="input-address" value={form.address} onChange={e => set("address", e.target.value)}
          placeholder="123 Main St"
          className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>CITY</Label>
          <Input data-testid="input-city" value={form.city} onChange={e => set("city", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>STATE</Label>
          <Input data-testid="input-state" value={form.state} onChange={e => set("state", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>ZIP</Label>
          <Input data-testid="input-zip" value={form.zip} onChange={e => set("zip", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>STATUS</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger data-testid="select-status" className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {STATUSES.map(s => <SelectItem key={s} value={s} style={{ color: "var(--color-text)" }}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>LEAD SOURCE</Label>
          <Select value={form.source} onValueChange={v => set("source", v)}>
            <SelectTrigger data-testid="select-source" className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {SOURCES.map(s => <SelectItem key={s} value={s} style={{ color: "var(--color-text)" }}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>ROOF AGE (YEARS)</Label>
          <Input data-testid="input-roofAge" type="number" value={form.roofAge} onChange={e => set("roofAge", e.target.value)}
            className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>ROOF TYPE</Label>
          <Select value={form.roofType || ""} onValueChange={v => set("roofType", v)}>
            <SelectTrigger data-testid="select-roofType" className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {["Asphalt Shingle", "Metal", "Tile", "TPO/Flat", "Wood Shake", "Slate"].map(t =>
                <SelectItem key={t} value={t} style={{ color: "var(--color-text)" }}>{t}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>NOTES</Label>
        <textarea
          data-testid="textarea-notes"
          value={form.notes}
          onChange={e => set("notes", e.target.value)}
          rows={3}
          className="w-full mt-1 rounded-md px-3 py-2 text-sm resize-none"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)", outline: "none" }}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1"
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent" }}>
          Cancel
        </Button>
        <Button data-testid="button-submit" type="submit" className="flex-1 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}
          disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : existing ? "Update Lead" : "Create Lead"}
        </Button>
      </div>
    </form>
  );
}

export default function CRM() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["/api/leads", search],
    queryFn: () => {
      const url = search ? `/api/leads?q=${encodeURIComponent(search)}` : "/api/leads";
      return apiRequest("GET", url).then(r => r.json());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const filtered = statusFilter === "all"
    ? leads
    : leads.filter((l: any) => l.status === statusFilter);

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white" style={{ fontSize: 26 }}>CRM — LEADS</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>{leads.length} total contacts</p>
        </div>
        <Button data-testid="button-new-lead" onClick={() => setShowForm(true)}
          className="flex items-center gap-2 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }}>
          <Plus size={15} /> New Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted)" }} />
          <Input
            data-testid="input-search"
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", ...STATUSES].map(s => (
            <button
              key={s}
              data-testid={`filter-${s}`}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: statusFilter === s ? "var(--color-green-dim)" : "var(--color-surface)",
                color: statusFilter === s ? "var(--color-green)" : "var(--color-muted)",
                border: `1px solid ${statusFilter === s ? "var(--color-green)" : "var(--color-border)"}`,
              }}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="section-panel overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <User size={40} style={{ color: "var(--color-muted)", margin: "0 auto 12px" }} />
            <div style={{ color: "var(--color-text)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No leads found</div>
            <div style={{ color: "var(--color-muted)", fontSize: 13 }}>Add your first lead to get started</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Address / ZIP</th>
                  <th>Phone</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead: any) => (
                  <tr key={lead.id} data-testid={`row-lead-${lead.id}`}>
                    <td>
                      <Link href={`/crm/${lead.id}`}>
                        <a className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                            style={{ background: "var(--color-green-dim)", color: "var(--color-green)" }}
                          >
                            {lead.firstName[0]}{lead.lastName[0]}
                          </div>
                          <div>
                            <div className="font-semibold" style={{ fontSize: 13, color: "var(--color-text)" }}>
                              {lead.firstName} {lead.lastName}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{lead.email}</div>
                          </div>
                        </a>
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, color: "var(--color-text)" }}>{lead.address}</div>
                      <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{lead.city}, {lead.state} {lead.zip}</div>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--color-text)" }}>{lead.phone}</td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--color-muted)", textTransform: "capitalize" }}>{lead.source}</span>
                    </td>
                    <td><StatusBadge status={lead.status} /></td>
                    <td style={{ fontSize: 11, color: "var(--color-muted)" }}>
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <Link href={`/crm/${lead.id}`}>
                        <a className="p-1.5 rounded hover:opacity-80 transition-opacity" style={{ color: "var(--color-green)" }}>
                          <ChevronRight size={15} />
                        </a>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Lead Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          <DialogHeader>
            <DialogTitle className="font-display font-bold" style={{ color: "var(--color-text)", fontSize: 20 }}>
              NEW LEAD
            </DialogTitle>
          </DialogHeader>
          <LeadForm onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { LeadForm };
