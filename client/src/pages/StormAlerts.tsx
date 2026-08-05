import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  CloudLightning, Plus, RefreshCw, MapPin, Wind, AlertTriangle,
  Tornado, Users, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STORM_ICONS: Record<string, any> = {
  hail: CloudLightning,
  wind: Wind,
  tornado: Tornado,
  hurricane: AlertTriangle,
};
const STORM_COLORS: Record<string, string> = {
  hail: "#0ea5e9",
  wind: "#f59e0b",
  tornado: "#ef4444",
  hurricane: "#8b5cf6",
  minor: "#5cbf00",
  moderate: "#f59e0b",
  severe: "#f97316",
  extreme: "#ef4444",
};

function AlertForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    eventDate: new Date().toISOString().split("T")[0],
    stormType: "hail",
    severity: "moderate",
    maxHailSize: "",
    maxWindSpeed: "",
    affectedZips: "",
    description: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/storm-alerts", {
      ...data,
      affectedZips: JSON.stringify(data.affectedZips.split(",").map((z: string) => z.trim()).filter(Boolean)),
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storm-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Storm alert created" });
      onClose();
    },
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>EVENT DATE *</Label>
          <Input type="date" value={form.eventDate} onChange={e => set("eventDate", e.target.value)} required
            className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>STORM TYPE *</Label>
          <Select value={form.stormType} onValueChange={v => set("stormType", v)}>
            <SelectTrigger className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {["hail", "wind", "tornado", "hurricane"].map(t =>
                <SelectItem key={t} value={t} style={{ color: "var(--color-text)", textTransform: "capitalize" }}>{t}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>SEVERITY</Label>
          <Select value={form.severity} onValueChange={v => set("severity", v)}>
            <SelectTrigger className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              {["minor", "moderate", "severe", "extreme"].map(s =>
                <SelectItem key={s} value={s} style={{ color: "var(--color-text)", textTransform: "capitalize" }}>{s}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>MAX HAIL SIZE (IN)</Label>
          <Input type="number" step="0.25" value={form.maxHailSize} onChange={e => set("maxHailSize", e.target.value)}
            placeholder="1.75" className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div>
          <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>MAX WIND (MPH)</Label>
          <Input type="number" value={form.maxWindSpeed} onChange={e => set("maxWindSpeed", e.target.value)}
            placeholder="60" className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
        </div>
      </div>
      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>AFFECTED ZIP CODES (comma-separated) *</Label>
        <Input value={form.affectedZips} onChange={e => set("affectedZips", e.target.value)} required
          placeholder="77001, 77002, 77003, 77004"
          className="mt-1" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
      </div>
      <div>
        <Label style={{ color: "var(--color-muted)", fontSize: 11 }}>DESCRIPTION</Label>
        <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3}
          className="w-full mt-1 rounded-md px-3 py-2 text-sm resize-none"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)", outline: "none" }} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1"
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent" }}>Cancel</Button>
        <Button type="submit" className="flex-1 font-semibold"
          style={{ background: "var(--color-green)", color: "#0a1500" }} disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Log Storm Alert"}
        </Button>
      </div>
    </form>
  );
}

export default function StormAlerts() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [affectedLeads, setAffectedLeads] = useState<any[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["/api/storm-alerts"],
    queryFn: () => apiRequest("GET", "/api/storm-alerts").then(r => r.json()),
  });

  async function fetchLiveAlerts() {
    setLoadingLive(true);
    try {
      const res = await apiRequest("GET", "/api/storm-alerts/live?state=TX");
      const data = await res.json();
      setLiveAlerts(data);
      toast({ title: `${data.length} live NOAA alerts for Texas`, description: data.length === 0 ? "No active storm warnings" : undefined });
    } catch {
      toast({ title: "Failed to fetch live alerts", variant: "destructive" });
    }
    setLoadingLive(false);
  }

  async function findAffectedLeads(alertId: number) {
    const res = await apiRequest("POST", `/api/storm-alerts/${alertId}/find-leads`, {});
    const data = await res.json();
    setAffectedLeads(data);
  }

  const sendAlertsMutation = useMutation({
    mutationFn: async ({ alertId, leads }: { alertId: number; leads: any[] }) => {
      for (const lead of leads) {
        await apiRequest("POST", "/api/emails/send", { leadId: lead.id, type: "storm-alert" });
      }
      await apiRequest("PATCH", `/api/storm-alerts/${alertId}`, { leadsNotified: true });
      return leads.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["/api/storm-alerts"] });
      toast({ title: `Storm alert sent to ${count} leads` });
      setSelectedAlert(null);
      setAffectedLeads([]);
    },
  });

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-white" style={{ fontSize: 26 }}>STORM ALERTS</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Track storms and notify customers in affected areas</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchLiveAlerts} disabled={loadingLive} variant="outline"
            className="flex items-center gap-2"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)", background: "transparent" }}>
            <RefreshCw size={14} className={loadingLive ? "animate-spin" : ""} />
            {loadingLive ? "Fetching..." : "Live NOAA Alerts"}
          </Button>
          <Button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 font-semibold"
            style={{ background: "var(--color-green)", color: "#0a1500" }}>
            <Plus size={15} /> Log Alert
          </Button>
        </div>
      </div>

      {/* Live NOAA Alerts */}
      {liveAlerts.length > 0 && (
        <div className="section-panel p-5">
          <h3 className="font-display font-bold text-white mb-4" style={{ fontSize: 15 }}>
            LIVE NOAA ALERTS — TEXAS
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {liveAlerts.slice(0, 6).map((a: any) => (
              <div key={a.id} className="p-4 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold" style={{ fontSize: 13, color: "#ef4444" }}>{a.event}</span>
                  <span style={{ fontSize: 11, color: "var(--color-muted)" }}>{a.severity}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text)", marginBottom: 4 }}>{a.headline}</div>
                <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{a.areas?.slice(0, 80)}...</div>
                <div style={{ fontSize: 10, color: "var(--color-muted)", marginTop: 4 }}>
                  Expires: {a.expires ? new Date(a.expires).toLocaleString() : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logged Alerts */}
      <div className="section-panel overflow-hidden">
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <span className="font-display font-bold text-white" style={{ fontSize: 15 }}>LOGGED STORM EVENTS</span>
          <span style={{ fontSize: 12, color: "var(--color-muted)" }}>{alerts.length} events</span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Loading...</div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center">
            <CloudLightning size={40} style={{ color: "var(--color-muted)", margin: "0 auto 12px" }} />
            <div style={{ color: "var(--color-text)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No alerts logged</div>
            <div style={{ color: "var(--color-muted)", fontSize: 13 }}>Log a storm event or pull live NOAA data</div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {alerts.map((alert: any) => {
              const Icon = STORM_ICONS[alert.stormType] || CloudLightning;
              const color = STORM_COLORS[alert.stormType] || "#8a9099";
              const sColor = STORM_COLORS[alert.severity] || "#f59e0b";
              const zips: string[] = JSON.parse(alert.affectedZips || "[]");
              return (
                <div key={alert.id} className="p-4 hover:bg-opacity-40 transition-all" style={{ background: "transparent" }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}22`, color }}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-display font-bold text-white" style={{ fontSize: 15 }}>
                          {alert.stormType.toUpperCase()} EVENT
                        </span>
                        <span className="cw-badge" style={{ color: sColor, background: `${sColor}20` }}>
                          {alert.severity}
                        </span>
                        {alert.leadsNotified && (
                          <span className="cw-badge" style={{ color: "#22c55e", background: "rgba(34,197,94,0.1)" }}>
                            Notified
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 flex-wrap" style={{ fontSize: 12, color: "var(--color-muted)" }}>
                        <span>{alert.eventDate}</span>
                        {alert.maxHailSize && <span>Hail: {alert.maxHailSize}"</span>}
                        {alert.maxWindSpeed && <span>Wind: {alert.maxWindSpeed}mph</span>}
                        <span className="flex items-center gap-1"><MapPin size={11} />{zips.slice(0, 4).join(", ")}{zips.length > 4 ? ` +${zips.length - 4}` : ""}</span>
                      </div>
                      {alert.description && (
                        <div style={{ fontSize: 12, color: "var(--color-text)", marginTop: 4 }}>{alert.description}</div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          setSelectedAlert(alert);
                          await findAffectedLeads(alert.id);
                        }}
                        className="text-xs"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text)", background: "transparent" }}
                      >
                        <Users size={12} className="mr-1" /> Find Leads
                      </Button>
                    </div>
                  </div>

                  {/* Affected leads panel */}
                  {selectedAlert?.id === alert.id && (
                    <div className="mt-4 p-4 rounded-lg" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold" style={{ fontSize: 13, color: "var(--color-text)" }}>
                          {affectedLeads.length} leads in affected ZIP codes
                        </span>
                        {affectedLeads.length > 0 && (
                          <Button size="sm"
                            onClick={() => sendAlertsMutation.mutate({ alertId: alert.id, leads: affectedLeads })}
                            disabled={sendAlertsMutation.isPending || alert.leadsNotified}
                            className="flex items-center gap-1.5 text-xs font-semibold"
                            style={{ background: "var(--color-green)", color: "#0a1500" }}>
                            <Send size={11} />
                            {alert.leadsNotified ? "Already Notified" : "Send Storm Alert Emails"}
                          </Button>
                        )}
                      </div>
                      {affectedLeads.length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--color-muted)" }}>No leads found in these ZIP codes</div>
                      ) : (
                        <div className="space-y-1.5">
                          {affectedLeads.slice(0, 8).map((l: any) => (
                            <div key={l.id} className="flex items-center gap-2" style={{ fontSize: 12 }}>
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ background: "var(--color-green-dim)", color: "var(--color-green)" }}>
                                {l.firstName[0]}
                              </div>
                              <span style={{ color: "var(--color-text)" }}>{l.firstName} {l.lastName}</span>
                              <span style={{ color: "var(--color-muted)" }}>— {l.zip}</span>
                              <span style={{ color: "var(--color-muted)", marginLeft: "auto" }}>{l.email}</span>
                            </div>
                          ))}
                          {affectedLeads.length > 8 && (
                            <div style={{ fontSize: 11, color: "var(--color-muted)" }}>+{affectedLeads.length - 8} more</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          <DialogHeader>
            <DialogTitle className="font-display font-bold flex items-center gap-2" style={{ color: "var(--color-text)", fontSize: 20 }}>
              <CloudLightning size={18} style={{ color: "#f43f5e" }} /> LOG STORM ALERT
            </DialogTitle>
          </DialogHeader>
          <AlertForm onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
