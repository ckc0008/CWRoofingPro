import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import cwLogoSrc from "@assets/cw-logo.png";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

// Pages
import Dashboard from "@/pages/Dashboard";
import CRM from "@/pages/CRM";
import LeadDetail from "@/pages/LeadDetail";
import Estimates from "@/pages/Estimates";
import StormAlerts from "@/pages/StormAlerts";
import PhotoProjects from "@/pages/PhotoProjects";
import ProjectDetail from "@/pages/ProjectDetail";
import EmailCenter from "@/pages/EmailCenter";
import Settings from "@/pages/Settings";
import Measurements from "@/pages/Measurements";
import InsuranceClaims from "@/pages/InsuranceClaims";
import Jobs from "@/pages/Jobs";
import Contracts from "@/pages/Contracts";
import EstimatePortal from "@/pages/EstimatePortal";
import MaterialOrders from "@/pages/MaterialOrders";
import Payments from "@/pages/Payments";
import Supplements from "@/pages/Supplements";
import Subcontractors from "@/pages/Subcontractors";
import Documents from "@/pages/Documents";
import Referrals from "@/pages/Referrals";
import Commissions from "@/pages/Commissions";
import NotFound from "@/pages/not-found";

// Icons
import {
  LayoutDashboard, Users, FileText, CloudLightning,
  Camera, Mail, Settings as SettingsIcon, Menu, X, ChevronRight, Ruler,
  ShieldCheck, Briefcase, FileSignature, DollarSign, Wrench, FolderOpen,
  Share2, TrendingUp, Package,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/crm", label: "CRM / Leads", icon: Users },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/estimates", label: "Estimates", icon: FileText },
  { href: "/measurements", label: "Measurements", icon: Ruler },
  { href: "/insurance-claims", label: "Insurance Claims", icon: ShieldCheck },
  { href: "/contracts", label: "Contracts", icon: FileSignature },
  { href: "/payments", label: "Payments", icon: DollarSign },
  { href: "/supplements", label: "Supplements", icon: Package },
  { href: "/subcontractors", label: "Subcontractors", icon: Wrench },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/referrals", label: "Referrals", icon: Share2 },
  { href: "/commissions", label: "Commissions", icon: TrendingUp },
  { href: "/material-orders", label: "Material Orders", icon: Package },
  { href: "/storm-alerts", label: "Storm Alerts", icon: CloudLightning },
  { href: "/photo-projects", label: "Photo Reports", icon: Camera },
  { href: "/emails", label: "Email Center", icon: Mail },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loc] = useLocation();
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 left-0 h-full z-40 flex flex-col transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex`}
        style={{ width: 240, background: "var(--color-surface)", borderRight: "1px solid var(--color-border)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center px-4 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <img
            src={cwLogoSrc}
            alt="CW Roofing & Construction"
            style={{ height: 64, width: "auto", objectFit: "contain" }}
          />
          <button
            className="ml-auto lg:hidden"
            onClick={onClose}
            style={{ color: "var(--color-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = loc === href || (href !== "/" && loc.startsWith(href));
            return (
              <Link key={href} href={href}>
                <a
                  onClick={onClose}
                  className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-all"
                  style={{
                    background: active ? "var(--color-green-dim)" : "transparent",
                    color: active ? "var(--color-green)" : "var(--color-muted)",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <Icon size={17} />
                  <span style={{ fontSize: 13 }}>{label}</span>
                  {active && <ChevronRight size={13} className="ml-auto opacity-60" />}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
            <div className="font-semibold" style={{ color: "var(--color-text)", marginBottom: 2 }}>CW Roofing & Construction</div>
            <div>cwroofingservices.com</div>
            <div style={{ marginTop: 4, color: "var(--color-green)", fontSize: 10 }}>● Protect What Matters</div>
          </div>
        </div>
      </aside>
    </>
  );
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header
      className="flex items-center gap-4 px-4 lg:px-6 h-14 sticky top-0 z-20"
      style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
    >
      <button className="lg:hidden p-1" onClick={onMenuClick} style={{ color: "var(--color-muted)" }}>
        <Menu size={20} />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-muted)" }}>
        <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-green)" }} />
        System Online
      </div>
    </header>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        {/* Public portal route — no sidebar/nav */}
        <Route path="/portal/:id" component={EstimatePortal} />

        {/* Main app shell */}
        <Route>
          {() => (
            <div className="flex h-screen overflow-hidden">
              <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <TopBar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                  <Switch>
                    <Route path="/" component={Dashboard} />
                    <Route path="/crm" component={CRM} />
                    <Route path="/crm/:id" component={LeadDetail} />
                    <Route path="/jobs" component={Jobs} />
                    <Route path="/estimates" component={Estimates} />
                    <Route path="/measurements" component={Measurements} />
                    <Route path="/insurance-claims" component={InsuranceClaims} />
                    <Route path="/contracts" component={Contracts} />
                    <Route path="/payments" component={Payments} />
                    <Route path="/supplements" component={Supplements} />
                    <Route path="/subcontractors" component={Subcontractors} />
                    <Route path="/documents" component={Documents} />
                    <Route path="/referrals" component={Referrals} />
                    <Route path="/commissions" component={Commissions} />
                    <Route path="/material-orders" component={MaterialOrders} />
                    <Route path="/storm-alerts" component={StormAlerts} />
                    <Route path="/photo-projects" component={PhotoProjects} />
                    <Route path="/photo-projects/:id" component={ProjectDetail} />
                    <Route path="/emails" component={EmailCenter} />
                    <Route path="/settings" component={Settings} />
                    <Route component={NotFound} />
                  </Switch>
                </main>
              </div>
            </div>
          )}
        </Route>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}
