import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Clock, CheckCircle2, XCircle } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  welcome: "#5cbf00", "follow-up": "#0ea5e9", "storm-alert": "#ef4444",
  appointment: "#f59e0b", estimate: "#8b5cf6", completion: "#22c55e", custom: "#8a9099",
};

export default function EmailCenter() {
  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["/api/emails"],
    queryFn: () => apiRequest("GET", "/api/emails").then(r => r.json()),
  });

  const sent = emails.filter((e: any) => e.status === "sent").length;
  const pending = emails.filter((e: any) => e.status === "pending").length;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="font-display font-bold text-white" style={{ fontSize: 26 }}>EMAIL CENTER</h1>
        <p style={{ fontSize: 13, color: "var(--color-muted)" }}>All automated and manual email communications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Emails", value: emails.length, color: "#8a9099" },
          { label: "Sent", value: sent, color: "#5cbf00" },
          { label: "Pending", value: pending, color: "#f59e0b" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="font-display font-bold" style={{ fontSize: 26, color }}>{value}</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-xl" style={{ background: "rgba(92,191,0,0.08)", border: "1px solid rgba(92,191,0,0.2)" }}>
        <div className="font-semibold mb-1" style={{ fontSize: 13, color: "var(--color-green)" }}>Email Automation Active</div>
        <div style={{ fontSize: 13, color: "var(--color-text)" }}>
          Emails are logged when sent from a lead's profile. To actually deliver emails, add your SMTP credentials or SendGrid API key in <strong>Settings</strong>. All templates are pre-built: Welcome, Follow-up, Storm Alert, Appointment Confirmation, and more.
        </div>
      </div>

      {/* Email Log */}
      <div className="section-panel overflow-hidden">
        <div className="p-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <span className="font-display font-bold text-white" style={{ fontSize: 15 }}>EMAIL LOG</span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Loading...</div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center">
            <Mail size={40} style={{ color: "var(--color-muted)", margin: "0 auto 12px" }} />
            <div style={{ color: "var(--color-text)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No emails sent yet</div>
            <div style={{ color: "var(--color-muted)", fontSize: 13 }}>Open a lead and use the Email Automation panel to send emails</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((e: any) => (
                  <tr key={e.id} data-testid={`row-email-${e.id}`}>
                    <td>
                      <span className="cw-badge" style={{ color: TYPE_COLORS[e.type] || "#8a9099", background: `${TYPE_COLORS[e.type] || "#8a9099"}20`, textTransform: "capitalize" }}>
                        {e.type.replace(/-/g, " ")}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--color-text)" }}>{e.toEmail}</td>
                    <td style={{ fontSize: 12, color: "var(--color-text)", maxWidth: 280 }}>
                      <div className="truncate">{e.subject}</div>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-xs"
                        style={{ color: e.status === "sent" ? "#5cbf00" : e.status === "failed" ? "#ef4444" : "#f59e0b" }}>
                        {e.status === "sent" ? <CheckCircle2 size={12} /> : e.status === "failed" ? <XCircle size={12} /> : <Clock size={12} />}
                        {e.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: "var(--color-muted)" }}>
                      {e.createdAt ? new Date(e.createdAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
