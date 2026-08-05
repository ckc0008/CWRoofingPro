import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useParams, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Upload, Camera, Brain, AlertTriangle, CheckCircle2,
  AlertCircle, Loader2, Download, Trash2, Tag, MapPin, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DAMAGE_COLORS: Record<string, string> = {
  none: "#22c55e", minor: "#f59e0b", moderate: "#f97316", severe: "#ef4444",
  unknown: "#8a9099",
};
const DAMAGE_ICONS: Record<string, any> = {
  none: CheckCircle2, minor: AlertCircle, moderate: AlertTriangle, severe: AlertTriangle, unknown: Loader2,
};

const TAGS = ["general", "damage", "before", "after", "progress", "materials", "gutters", "fascia"];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadTag, setUploadTag] = useState("damage");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [leadMatches, setLeadMatches] = useState<any[]>([]);

  const { data: project, isLoading: projLoading } = useQuery({
    queryKey: ["/api/projects", id],
    queryFn: () => apiRequest("GET", `/api/projects/${id}`).then(r => r.json()),
  });

  const { data: photos = [], isLoading: photosLoading, refetch: refetchPhotos } = useQuery({
    queryKey: ["/api/projects", id, "photos"],
    queryFn: () => apiRequest("GET", `/api/projects/${id}/photos`).then(r => r.json()),
    refetchInterval: 3000, // poll for AI analysis updates
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: number) => apiRequest("DELETE", `/api/photos/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "photos"] });
      if (selectedPhoto?.id === deleteMutation.variables) setSelectedPhoto(null);
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append("photos", f));
    formData.append("tag", uploadTag);
    try {
      const res = await fetch(`/api/projects/${id}/photos`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      // New response format: { photos: [...], leadMatches: [...] }
      const photoArr = Array.isArray(data) ? data : (data.photos ?? []);
      const matches = Array.isArray(data) ? [] : (data.leadMatches ?? []);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "photos"] });
      setLeadMatches(matches);
      const matchMsg = matches.length > 0
        ? ` GPS matched ${matches.length} photo(s) to existing leads.`
        : "";
      toast({
        title: `${photoArr.length} photo(s) uploaded`,
        description: `AI analysis running in background.${matchMsg}`,
      });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function generateReport() {
    setGeneratingReport(true);
    try {
      const res = await apiRequest("GET", `/api/projects/${id}/report`);
      setReport(await res.json());
    } catch {
      toast({ title: "Report generation failed", variant: "destructive" });
    }
    setGeneratingReport(false);
  }

  async function reanalyze(photoId: number) {
    try {
      await apiRequest("POST", `/api/photos/${photoId}/analyze`, {});
      await refetchPhotos();
      toast({ title: "Re-analysis complete" });
    } catch {
      toast({ title: "Analysis failed", variant: "destructive" });
    }
  }

  if (projLoading) return <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Loading...</div>;
  if (!project) return <div className="p-8 text-center" style={{ color: "var(--color-muted)" }}>Project not found</div>;

  const analyzed = photos.filter((p: any) => p.aiAnalyzed);
  const damagePhotos = photos.filter((p: any) => p.aiDamageLevel && !["none", "unknown"].includes(p.aiDamageLevel));
  const overallSeverity = damagePhotos.some((p: any) => p.aiDamageLevel === "severe") ? "severe"
    : damagePhotos.some((p: any) => p.aiDamageLevel === "moderate") ? "moderate"
    : damagePhotos.some((p: any) => p.aiDamageLevel === "minor") ? "minor" : "none";

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/photo-projects">
          <a className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-muted)" }}>
            <ArrowLeft size={15} /> Projects
          </a>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-white" style={{ fontSize: 24 }}>{project.name.toUpperCase()}</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>{project.address}</p>
          <span className="cw-badge mt-2" style={{ color: "#0ea5e9", background: "rgba(14,165,233,0.12)", textTransform: "capitalize" }}>
            {project.type.replace(/-/g, " ")}
          </span>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={generateReport} disabled={generatingReport || photos.length === 0}
            variant="outline" className="flex items-center gap-2 text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)", background: "transparent" }}>
            {generatingReport ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Generate Report
          </Button>
          <Button data-testid="button-upload" onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 font-semibold"
            style={{ background: "var(--color-green)", color: "#0a1500" }}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? "Uploading..." : "Upload Photos"}
          </Button>
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* GPS Lead Match Notifications */}
      {leadMatches.length > 0 && (
        <div className="p-4 rounded-xl space-y-2" style={{ background: "rgba(92,191,0,0.07)", border: "1px solid rgba(92,191,0,0.25)" }}>
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={14} style={{ color: "var(--color-green)" }} />
            <span className="font-semibold text-sm" style={{ color: "var(--color-green)" }}>
              GPS Auto-Match — {leadMatches.length} photo(s) linked to existing leads
            </span>
            <button onClick={() => setLeadMatches([])} className="ml-auto text-xs" style={{ color: "var(--color-muted)" }}>Dismiss</button>
          </div>
          {leadMatches.map((match: any, i: number) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
              <CheckCircle2 size={13} style={{ color: "var(--color-green)" }} />
              <div className="flex-1 min-w-0">
                <span style={{ fontSize: 12, color: "var(--color-text)" }}>Photo matched to </span>
                <span style={{ fontSize: 12, color: "var(--color-green)", fontWeight: 600 }}>{match.leadName}</span>
                {match.gpsAddress && (
                  <span style={{ fontSize: 11, color: "var(--color-muted)", display: "block" }}>
                    GPS address: {match.gpsAddress}
                  </span>
                )}
              </div>
              <Link href={`/crm/${match.leadId}`}>
                <a className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: "var(--color-green)" }}>
                  View Lead <ChevronRight size={11} />
                </a>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Photos", value: photos.length, color: "#8a9099" },
          { label: "AI Analyzed", value: analyzed.length, color: "#5cbf00" },
          { label: "Damage Found", value: damagePhotos.length, color: "#f97316" },
          {
            label: "Overall Damage",
            value: overallSeverity.charAt(0).toUpperCase() + overallSeverity.slice(1),
            color: DAMAGE_COLORS[overallSeverity] || "#8a9099"
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="font-display font-bold" style={{ fontSize: 20, color }}>{value}</div>
            <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Upload Tag + Photos */}
      <div className="section-panel p-5">
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <h3 className="font-display font-bold text-white" style={{ fontSize: 15 }}>PHOTOS ({photos.length})</h3>
          <div className="flex items-center gap-2 ml-auto">
            <Tag size={13} style={{ color: "var(--color-muted)" }} />
            <span style={{ fontSize: 12, color: "var(--color-muted)" }}>Upload tag:</span>
            <Select value={uploadTag} onValueChange={setUploadTag}>
              <SelectTrigger className="w-36 h-8" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text)", fontSize: 12 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                {TAGS.map(t => <SelectItem key={t} value={t} style={{ color: "var(--color-text)" }}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {photos.length === 0 ? (
          <div
            className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all"
            style={{ borderColor: "var(--color-border)" }}
            onClick={() => fileRef.current?.click()}
          >
            <Camera size={40} style={{ color: "var(--color-muted)", margin: "0 auto 12px" }} />
            <div style={{ color: "var(--color-text)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No photos yet</div>
            <div style={{ color: "var(--color-muted)", fontSize: 13 }}>Click to upload or drag & drop field photos</div>
            <div style={{ color: "var(--color-muted)", fontSize: 11, marginTop: 8 }}>
              AI will automatically analyze each photo for damage severity
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo: any) => {
              const dmgColor = DAMAGE_COLORS[photo.aiDamageLevel || "unknown"];
              const DmgIcon = DAMAGE_ICONS[photo.aiDamageLevel || "unknown"] || Loader2;
              return (
                <div
                  key={photo.id}
                  data-testid={`photo-${photo.id}`}
                  className="rounded-xl overflow-hidden cursor-pointer transition-all group"
                  style={{ border: `2px solid ${photo.aiAnalyzed ? dmgColor + "60" : "var(--color-border)"}` }}
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <div className="relative aspect-square">
                    <img src={photo.url} alt={photo.originalName}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as any).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23222' width='100' height='100'/><text fill='%23555' x='50' y='55' text-anchor='middle' font-size='14'>No preview</text></svg>"; }} />
                    {/* Damage overlay */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full"
                      style={{ background: "rgba(0,0,0,0.75)" }}>
                      {!photo.aiAnalyzed ? (
                        <Loader2 size={10} className="animate-spin" style={{ color: "#8a9099" }} />
                      ) : (
                        <DmgIcon size={10} style={{ color: dmgColor }} />
                      )}
                      <span style={{ fontSize: 10, color: photo.aiAnalyzed ? dmgColor : "#8a9099" }}>
                        {photo.aiAnalyzed ? (photo.aiDamageLevel || "—") : "analyzing..."}
                      </span>
                    </div>
                    {/* Tag */}
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-xs"
                      style={{ background: "rgba(0,0,0,0.75)", color: "#ccc" }}>
                      {photo.tag}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Photo Detail */}
      {selectedPhoto && (
        <div className="section-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white" style={{ fontSize: 15 }}>PHOTO ANALYSIS</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => reanalyze(selectedPhoto.id)}
                className="text-xs flex items-center gap-1.5"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)", background: "transparent" }}>
                <Brain size={12} /> Re-analyze
              </Button>
              <Button size="sm" variant="outline" onClick={() => { deleteMutation.mutate(selectedPhoto.id); }}
                className="text-xs flex items-center gap-1.5"
                style={{ borderColor: "rgba(239,68,68,0.4)", color: "#ef4444", background: "transparent" }}>
                <Trash2 size={12} /> Delete
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedPhoto(null)}
                className="text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent" }}>
                Close
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-xl overflow-hidden aspect-video">
              <img src={selectedPhoto.url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="space-y-4">
              <div>
                <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 4 }}>FILENAME</div>
                <div style={{ fontSize: 13, color: "var(--color-text)" }}>{selectedPhoto.originalName}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 4 }}>TAG</div>
                <span className="cw-badge" style={{ color: "#0ea5e9", background: "rgba(14,165,233,0.12)" }}>{selectedPhoto.tag}</span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 4 }}>DAMAGE LEVEL</div>
                {selectedPhoto.aiAnalyzed ? (
                  <span className="cw-badge" style={{
                    color: DAMAGE_COLORS[selectedPhoto.aiDamageLevel || "unknown"],
                    background: `${DAMAGE_COLORS[selectedPhoto.aiDamageLevel || "unknown"]}20`,
                    textTransform: "capitalize",
                  }}>
                    {selectedPhoto.aiDamageLevel || "Unknown"}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--color-muted)" }}>Analyzing...</span>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 6 }}>AI DESCRIPTION</div>
                <div className="p-3 rounded-lg text-sm" style={{ background: "var(--color-surface-2)", color: "var(--color-text)", lineHeight: 1.7 }}>
                  {selectedPhoto.aiDescription || (
                    selectedPhoto.aiAnalyzed ? "No description generated" : "AI analysis in progress..."
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Panel */}
      {report && (
        <div className="section-panel p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-white" style={{ fontSize: 15 }}>INSPECTION REPORT</h3>
            <Button size="sm" variant="outline" onClick={() => setReport(null)}
              style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "transparent", fontSize: 12 }}>
              Close
            </Button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {[
              { label: "Total Photos", value: report.totalPhotos, color: "#8a9099" },
              { label: "Analyzed", value: report.analyzedPhotos, color: "#5cbf00" },
              { label: "Damage Photos", value: report.damagePhotos, color: "#f97316" },
              { label: "Overall Damage", value: report.overallDamage, color: DAMAGE_COLORS[report.overallDamage?.toLowerCase()] || "#8a9099" },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-4 rounded-lg" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                <div className="font-bold" style={{ fontSize: 18, color }}>{value}</div>
                <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{label}</div>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-lg mb-4" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginBottom: 8 }}>DAMAGE BREAKDOWN</div>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(report.severityBreakdown).map(([level, count]) => (
                <div key={level} className="text-center">
                  <div className="font-bold" style={{ fontSize: 20, color: DAMAGE_COLORS[level] || "#8a9099" }}>{count as number}</div>
                  <div style={{ fontSize: 11, color: "var(--color-muted)", textTransform: "capitalize" }}>{level}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
            Generated by {report.companyName} • {new Date(report.generatedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
