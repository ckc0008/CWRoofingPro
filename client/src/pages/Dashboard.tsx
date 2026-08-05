import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Users, Briefcase, FileText, CloudLightning, DollarSign, Camera,
  TrendingUp, AlertCircle, CheckCircle2, Clock, Plus
} from "lucide-react";

function StatCard({ label, value, icon: Icon, color, sub, href }: any) {
  const content = (
    <div className="stat-card hover:border-opacity-60 transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}22`, color }}
        >
          <Icon size={18} />
        </div>
        {sub && <span style={{ fontSize: 11, color: "var(--color-muted)" }}>{sub}</span>}
      </div>
      <div className="font-display font-bold" style={{ fontSize: 28, color: "var(--color-text)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>{label}</div>
    </div>
  );
  return href ? <Link href={href}><a>{content}</a></Link> : content;
}

function PipelineBar({ data }: { data: Record<string, number> }) {
  const stages = [
    { key: "new", label: "New", color: "#5cbf00" },
    { key: "contacted", label: "Contacted", color: "#0ea5e9" },
    { key: "inspected", label: "Inspected", color: "#f59e0b" },
    { key: "quoted", label: "Quoted", color: "#8b5cf6" },
    { key: "won", label: "Won", color: "#22c55e" },
    { key: "lost", label: "Lost", color: "#ef4444" },
  ];
  const total = Object.values(data).reduce((s, v) => s + v, 0) || 1;
  return (
    <div className="section-panel p-5">
      <h3 className="font-display font-bold text-white mb-4" style={{ fontSize: 16 }}>LEAD PIPELINE</h3>
      <div className="flex rounded-full overflow-hidden h-3 mb-4" style={{ background: "var(--color-border)" }}>
        {stages.map(s => {
          const pct = ((data[s.key] || 0) / total) * 100;
          return pct > 0 ? (
            <div key={s.key} style={{ width: `${pct}%`, background: s.color }} title={`${s.label}: ${data[s.key] || 0}`} />
          ) : null;
        })}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stages.map(s => (
          <div key={s.key} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <div>
              <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{s.label}</div>
              <div className="font-semibold" style={{ fontSize: 14, color: "var(--color-text)" }}>{data[s.key] || 0}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then(r => r.json()),
    refetchInterval: 30000,
  });
  const { data: leads } = useQuery({
    queryKey: ["/api/leads"],
    queryFn: () => apiRequest("GET", "/api/leads").then(r => r.json()),
  });
  const { data: alerts } = useQuery({
    queryKey: ["/api/storm-alerts"],
    queryFn: () => apiRequest("GET", "/api/storm-alerts").then(r => r.json()),
  });

  const recentLeads = (leads || []).slice(0, 5);
  const recentAlerts = (alerts || []).slice(0, 3);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white" style={{ fontSize: 28 }}>COMMAND CENTER</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 2 }}>
            CW Roofing & Construction — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link href="/crm">
          <a
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all"
            style={{ background: "var(--color-green)", color: "#0a1500" }}
          >
            <Plus size={15} />
            New Lead
          </a>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={stats?.totalLeads || 0} icon={Users} color="#5cbf00" href="/crm" />
        <StatCard label="Active Jobs" value={stats?.activeJobs || 0} icon={Briefcase} color="#0ea5e9" />
        <StatCard label="Pending Quotes" value={stats?.pendingEstimates || 0} icon={FileText} color="#f59e0b" href="/estimates" />
        <StatCard label="Total Revenue" value={`$${((stats?.totalRevenue || 0) / 1000).toFixed(1)}K`} icon={DollarSign} color="#22c55e" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Storm Alerts" value={stats?.recentAlerts || 0} icon={CloudLightning} color="#f43f5e" href="/storm-alerts" />
        <StatCard label="Photo Projects" value={stats?.activeProjects || 0} icon={Camera} color="#8b5cf6" href="/photo-projects" />
        <StatCard label="New This Week" value={stats?.newLeads || 0} icon={TrendingUp} color="#06b6d4" />
        <StatCard label="Win Rate" value={`${stats?.conversionRate || 0}%`} icon={CheckCircle2} color="#5cbf00" />
      </div>

      {/* Pipeline + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineBar data={stats?.leadsByStatus || {}} />

        {/* Recent Leads */}
        <div className="section-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white" style={{ fontSize: 16 }}>RECENT LEADS</h3>
            <Link href="/crm">
              <a style={{ fontSize: 12, color: "var(--color-green)" }}>View all →</a>
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <div className="text-center py-6" style={{ color: "var(--color-muted)", fontSize: 13 }}>
              No leads yet — add your first lead in CRM
            </div>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead: any) => (
                <Link key={lead.id} href={`/crm/${lead.id}`}>
                  <a className="flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-opacity-60"
                    style={{ background: "var(--color-surface-2)" }}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                      style={{ background: "var(--color-green-dim)", color: "var(--color-green)" }}
                    >
                      {lead.firstName[0]}{lead.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate" style={{ fontSize: 13, color: "var(--color-text)" }}>
                        {lead.firstName} {lead.lastName}
                      </div>
                      <div className="truncate" style={{ fontSize: 11, color: "var(--color-muted)" }}>{lead.address}</div>
                    </div>
                    <StatusBadge status={lead.status} />
                  </a>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Storm alerts preview */}
      {recentAlerts.length > 0 && (
        <div className="section-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white flex items-center gap-2" style={{ fontSize: 16 }}>
              <CloudLightning size={16} style={{ color: "#f43f5e" }} />
              ACTIVE STORM ALERTS
            </h3>
            <Link href="/storm-alerts">
              <a style={{ fontSize: 12, color: "var(--color-green)" }}>Manage alerts →</a>
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {recentAlerts.map((alert: any) => (
              <div key={alert.id} className="p-3 rounded-lg" style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle size={13} style={{ color: "#f43f5e" }} />
                  <span className="font-semibold uppercase" style={{ fontSize: 12, color: "#f43f5e" }}>{alert.stormType}</span>
                  <span className="ml-auto" style={{ fontSize: 10, color: "var(--color-muted)" }}>{alert.severity}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text)" }}>{alert.eventDate}</div>
                <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
                  {JSON.parse(alert.affectedZips || "[]").slice(0, 3).join(", ")}
                  {JSON.parse(alert.affectedZips || "[]").length > 3 ? "..." : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    new: { label: "New", color: "#5cbf00", bg: "rgba(92,191,0,0.12)" },
    contacted: { label: "Contacted", color: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
    inspected: { label: "Inspected", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    quoted: { label: "Quoted", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
    won: { label: "Won", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    lost: { label: "Lost", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
    // Jobs
    inspection: { label: "Inspection", color: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
    "estimate-sent": { label: "Est. Sent", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    approved: { label: "Approved", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
    "in-progress": { label: "In Progress", color: "#5cbf00", bg: "rgba(92,191,0,0.12)" },
    complete: { label: "Complete", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    invoiced: { label: "Invoiced", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    paid: { label: "Paid", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    // Estimates
    draft: { label: "Draft", color: "#8a9099", bg: "rgba(138,144,153,0.12)" },
    sent: { label: "Sent", color: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
    viewed: { label: "Viewed", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    rejected: { label: "Rejected", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  };
  const s = map[status] || { label: status, color: "#8a9099", bg: "rgba(138,144,153,0.12)" };
  return (
    <span
      className="cw-badge flex-shrink-0"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}
