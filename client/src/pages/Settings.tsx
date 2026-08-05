import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Key, Satellite, Mail, Brain, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SettingGroup({ title, icon: Icon, color, children }: any) {
  return (
    <div className="section-panel p-5">
      <div className="flex items-center gap-3 mb-5" style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: 16 }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}22`, color }}>
          <Icon size={18} />
        </div>
        <h3 className="font-display font-bold text-white" style={{ fontSize: 16 }}>{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SettingField({ label, description, settingKey, type = "text", placeholder = "" }: any) {
  const { toast } = useToast();
  const { data: settings = [] } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: () => apiRequest("GET", "/api/settings").then(r => r.json()),
  });
  const currentVal = settings.find((s: any) => s.key === settingKey)?.value || "";
  const isMasked = currentVal === "***";
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      // Don't overwrite with "***" if user hasn't typed a new value
      if (isMasked && value === "") return Promise.resolve({});
      return apiRequest("POST", "/api/settings", { key: settingKey, value }).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  return (
    <div>
      <Label style={{ color: "var(--color-text)", fontSize: 13, fontWeight: 600 }}>{label}</Label>
      {description && <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2, marginBottom: 8 }}>{description}</p>}
      <div className="flex gap-2 mt-2">
        <Input
          data-testid={`setting-${settingKey}`}
          type={type}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={isMasked ? "••••••• (saved — paste new value to change)" : placeholder}
          className="flex-1"
          style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
        />
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}
          className="flex items-center gap-1.5 flex-shrink-0"
          style={{ background: saved ? "#22c55e" : "var(--color-green)", color: "#0a1500", fontSize: 12, fontWeight: 600 }}>
          {saved ? <><Check size={13} /> Saved</> : "Save"}
        </Button>
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-display font-bold text-white" style={{ fontSize: 26 }}>SETTINGS</h1>
        <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Configure API keys, integrations, and company details</p>
      </div>

      <SettingGroup title="COMPANY INFO" icon={Building2} color="#5cbf00">
        <SettingField label="Company Phone" settingKey="company_phone" placeholder="(832) 555-0100" />
        <SettingField label="Company Email" settingKey="company_email" placeholder="info@cwroofingservices.com" />
        <SettingField label="Company Address" settingKey="company_address" placeholder="Houston, TX" />
      </SettingGroup>

      <SettingGroup title="GOOGLE MAPS & SOLAR API" icon={Satellite} color="#0ea5e9">
        <SettingField
          label="Google Maps API Key"
          description="Enables satellite roof measurement via Google Solar API and address geocoding. Get yours at console.cloud.google.com — enable Solar API and Geocoding API."
          settingKey="google_maps_api_key"
          type="password"
          placeholder="AIza..."
        />
      </SettingGroup>

      <SettingGroup title="AI PHOTO ANALYSIS" icon={Brain} color="#8b5cf6">
        <SettingField
          label="OpenAI API Key"
          description="Powers AI damage descriptions and severity classification on uploaded field photos. Uses GPT-4o Vision. Get yours at platform.openai.com."
          settingKey="openai_api_key"
          type="password"
          placeholder="sk-..."
        />
      </SettingGroup>

      <SettingGroup title="EMAIL DELIVERY" icon={Mail} color="#f59e0b">
        <SettingField
          label="SendGrid API Key"
          description="Used to actually deliver emails. Without this, emails are logged only. Get your key at sendgrid.com."
          settingKey="sendgrid_api_key"
          type="password"
          placeholder="SG...."
        />
        <SettingField
          label="From Email Address"
          description="The email address your outbound emails are sent from."
          settingKey="email_from"
          placeholder="noreply@cwroofingservices.com"
        />
        <SettingField
          label="From Name"
          settingKey="email_from_name"
          placeholder="CW Roofing & Construction"
        />
      </SettingGroup>

      <SettingGroup title="HAIL TRACE API" icon={Key} color="#f43f5e">
        <SettingField
          label="HailTrace API Key"
          description="Connect your existing HailTrace subscription for weather history reports and hail data (optional — system uses NOAA as the free alternative)."
          settingKey="hailtrace_api_key"
          type="password"
          placeholder="ht_..."
        />
      </SettingGroup>

      <SettingGroup title="COMPANY CAM INTEGRATION" icon={Key} color="#22c55e">
        <SettingField
          label="CompanyCam API Key"
          description="Connect to sync your existing CompanyCam projects and photos into this system. Found in your CompanyCam account settings."
          settingKey="companycam_api_key"
          type="password"
          placeholder="cc_..."
        />
      </SettingGroup>

      <SettingGroup title="ARTEMIS ROOF MEASUREMENT" icon={Satellite} color="#5cbf00">
        <SettingField
          label="Artemis API Key"
          description="Artemis by artemispower.com — Nearmap + Vexcel + LiDAR roof reports (~$5.75/report). Request access at artemispower.com"
          settingKey="artemis_api_key"
          type="password"
          placeholder="Bearer token from Artemis dashboard"
        />
      </SettingGroup>

      {/* Pricing Config */}
      <SettingGroup title="ESTIMATE PRICING" icon={SettingsIcon} color="#f59e0b">
        <div className="p-3 rounded-lg text-sm" style={{ background: "var(--color-surface-2)", color: "var(--color-text)", lineHeight: 1.8 }}>
          <div style={{ fontSize: 12, color: "var(--color-muted)", marginBottom: 8 }}>CURRENT PRICING DEFAULTS (edit in source to customize)</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1" style={{ fontSize: 13 }}>
            <div className="flex justify-between"><span style={{ color: "var(--color-muted)" }}>Labor / square:</span><span>$75</span></div>
            <div className="flex justify-between"><span style={{ color: "var(--color-muted)" }}>Material / square:</span><span>$120</span></div>
            <div className="flex justify-between"><span style={{ color: "var(--color-muted)" }}>Tear-off / square:</span><span>$45</span></div>
            <div className="flex justify-between"><span style={{ color: "var(--color-muted)" }}>Dumpster:</span><span>$400</span></div>
            <div className="flex justify-between"><span style={{ color: "var(--color-muted)" }}>Permit:</span><span>$150</span></div>
            <div className="flex justify-between"><span style={{ color: "var(--color-muted)" }}>Gutters / LF:</span><span>$8</span></div>
            <div className="flex justify-between"><span style={{ color: "var(--color-muted)" }}>TX Sales Tax:</span><span>8.25%</span></div>
            <div className="flex justify-between"><span style={{ color: "var(--color-muted)" }}>Steep pitch mult:</span><span>1.15x (8+/12)</span></div>
          </div>
        </div>
      </SettingGroup>
    </div>
  );
}
