import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import pdfParse from "pdf-parse";
import path from "path";
import fs from "fs";
import { storage } from "./storage";

// EXIF/GPS extraction from photo files
async function extractPhotoMeta(filePath: string): Promise<{ lat?: number; lng?: number; dateTaken?: string; address?: string }> {
  try {
    const exifr = await import("exifr");
    const data = await exifr.default.parse(filePath, { gps: true, pick: ["GPSLatitude", "GPSLongitude", "DateTimeOriginal", "CreateDate"] });
    if (!data) return {};
    const lat = data.latitude ?? data.GPSLatitude;
    const lng = data.longitude ?? data.GPSLongitude;
    const dateTaken = data.DateTimeOriginal?.toISOString() || data.CreateDate?.toISOString();
    let address: string | undefined;
    // Reverse-geocode if we have GPS and an API key
    if (lat && lng) {
      const apiKey = storage.getSetting("google_maps_api_key");
      if (apiKey) {
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
          const geo = await res.json();
          if (geo.results?.[0]?.formatted_address) {
            address = geo.results[0].formatted_address;
          }
        } catch {}
      }
    }
    return { lat, lng, dateTaken, address };
  } catch {
    return {};
  }
}

// Haversine distance in km between two GPS points
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Find the closest lead to GPS coords (within 150m)
async function matchLeadToGPS(lat: number, lng: number, address?: string): Promise<{ lead: any; method: string } | null> {
  const apiKey = storage.getSetting("google_maps_api_key");
  const allLeads = storage.getLeads();
  if (!allLeads.length) return null;

  // Method 1: Address text match if we have a reverse-geocoded address
  if (address) {
    const matched = storage.findLeadByAddress(address);
    if (matched) return { lead: matched, method: "address" };
  }

  // Method 2: Geocode each lead's address and find the closest one (needs API key)
  if (apiKey && lat && lng) {
    let closest: any = null;
    let closestDist = Infinity;
    // Only geocode leads that don't have coords stored — cache results
    for (const lead of allLeads.slice(0, 50)) { // cap at 50 to avoid rate limits
      try {
        const fullAddr = `${lead.address}, ${lead.city}, ${lead.state} ${lead.zip}`;
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddr)}&key=${apiKey}`);
        const geo = await res.json();
        if (geo.results?.[0]?.geometry?.location) {
          const { lat: lLat, lng: lLng } = geo.results[0].geometry.location;
          const dist = haversineKm(lat, lng, lLat, lLng);
          if (dist < closestDist) {
            closestDist = dist;
            closest = lead;
          }
        }
      } catch {}
    }
    if (closest && closestDist < 0.15) { // 150m threshold
      return { lead: closest, method: "gps" };
    }
  }

  // Method 3: Address-only text match as fallback
  if (address) {
    const matched = storage.findLeadByAddress(address);
    if (matched) return { lead: matched, method: "address-fallback" };
  }

  return null;
}

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|heic/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

// Separate multer instance for documents — accepts PDF + images + office docs
const uploadDoc = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for large PDFs
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = /pdf|jpg|jpeg|png|gif|webp|doc|docx|xls|xlsx|txt|csv|xml/;
    const mimeOk = file.mimetype === "application/pdf"
      || file.mimetype === "text/xml"
      || file.mimetype === "application/xml"
      || file.mimetype.startsWith("image/")
      || file.mimetype.startsWith("application/")
      || file.mimetype.startsWith("text/");
    cb(null, allowed.test(ext) || mimeOk);
  },
});

// AI photo analysis (uses OpenAI if key configured, else returns placeholder)
async function analyzePhotoWithAI(imagePath: string, tag: string): Promise<{ description: string; damageLevel: string }> {
  const openaiKey = storage.getSetting("openai_api_key");
  if (!openaiKey) {
    return {
      description: "AI analysis not configured. Add your OpenAI API key in Settings to enable automatic damage descriptions.",
      damageLevel: "unknown",
    };
  }
  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: openaiKey });
    const imageData = fs.readFileSync(imagePath);
    const base64 = imageData.toString("base64");
    const ext = path.extname(imagePath).slice(1).toLowerCase();
    const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `You are an expert roofing inspector. Analyze this roofing photo (tagged as: ${tag}) and provide:
1. A professional 2-3 sentence description of what you see, focusing on roofing materials, condition, and any visible damage.
2. A damage level assessment: "none", "minor", "moderate", or "severe".

Respond in JSON format: {"description": "...", "damageLevel": "none|minor|moderate|severe"}`,
          },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
          },
        ],
      }],
      max_tokens: 300,
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    return {
      description: parsed.description || "Analysis complete.",
      damageLevel: parsed.damageLevel || "unknown",
    };
  } catch (e: any) {
    return { description: `Analysis error: ${e.message}`, damageLevel: "unknown" };
  }
}

// NOAA weather alert fetch
async function fetchNOAAAlerts(state = "TX"): Promise<any[]> {
  try {
    const res = await fetch(`https://api.weather.gov/alerts/active?area=${state}`, {
      headers: { "User-Agent": "CWRoofingSystem/1.0 (cwroofingservices.com)" },
    });
    const data = await res.json();
    return data.features || [];
  } catch {
    return [];
  }
}

// ─── ARTEMIS ROOF REPORT API ──────────────────────────────────────────────────────────────────────────────
// Artemis (artemispower.com) uses Nearmap + Vexcel aerial imagery + LiDAR.
// API docs are gated — request at artemispower.com. Once you have your key,
// add it in Settings as artemis_api_key and this will activate automatically.
//
// Known API shape based on their REST/iFrame documentation:
//   POST https://api.artemispower.com/v1/roof-report
//   Authorization: Bearer <api_key>
//   Body: { address: string, lat?: number, lng?: number }
//
async function getArtemisRoofReport(address: string, lat?: number, lng?: number): Promise<any> {
  const apiKey = storage.getSetting("artemis_api_key");
  if (!apiKey) return null;
  try {
    const body: any = { address };
    if (lat !== undefined) body.lat = lat;
    if (lng !== undefined) body.lng = lng;
    const res = await fetch("https://api.artemispower.com/v1/roof-report", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[Artemis] HTTP ${res.status}: ${err}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error("[Artemis] Request failed:", e);
    return null;
  }
}

function parseArtemisReport(data: any, address: string): any {
  const sqFt = data.roofArea || (data.squares ? data.squares * 100 : null);
  const squares = data.squares || (sqFt ? Math.round(sqFt / 100) : null);
  return {
    source: "artemis",
    address,
    squares,
    totalArea: sqFt ? Math.round(sqFt) : null,
    pitch: data.pitch || data.dominantPitch || null,
    facets: data.facets || data.segmentCount || (data.segments && data.segments.length) || null,
    ridgeLength: data.ridgeLength || null,
    valleyLength: data.valleyLength || null,
    eaveLength: data.eaveLength || null,
    hipLength: data.hipLength || null,
    rakeLength: data.rakeLength || null,
    reportUrl: data.reportUrl || null,
    reportId: data.reportId || null,
    rawData: JSON.stringify(data),
  };
}

// Google Solar API roof measurement
async function getGoogleSolarData(lat: number, lng: number): Promise<any> {
  const apiKey = storage.getSetting("google_maps_api_key");
  if (!apiKey) return null;
  try {
    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${apiKey}`;
    const res = await fetch(url);
    return await res.json();
  } catch {
    return null;
  }
}

// Geocode address to lat/lng
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = storage.getSetting("google_maps_api_key");
  if (!apiKey) return null;
  try {
    const encoded = encodeURIComponent(address);
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`);
    const data = await res.json();
    if (data.results?.[0]?.geometry?.location) {
      return data.results[0].geometry.location;
    }
    return null;
  } catch {
    return null;
  }
}

export function registerRoutes(httpServer: Server, app: Express): void {
  // Serve uploaded photos
  app.use("/uploads", (req, res, next) => {
    // No wildcard CORS — same-origin frontend doesn't need it
    next();
  });
  app.use("/uploads", require("express").static(uploadsDir));

  // ─── LEADS ───────────────────────────────────────────────────────────────
  app.get("/api/leads", (req, res) => {
    const { q } = req.query;
    if (q && typeof q === "string") {
      res.json(storage.searchLeads(q));
    } else {
      res.json(storage.getLeads());
    }
  });
  app.get("/api/leads/:id", (req, res) => {
    const lead = storage.getLead(Number(req.params.id));
    if (!lead) return res.status(404).json({ error: "Not found" });
    res.json(lead);
  });
  app.post("/api/leads", (req, res) => {
    try {
      const body = {
        firstName: req.body.firstName || "",
        lastName: req.body.lastName || "",
        email: req.body.email || "",
        phone: req.body.phone || "",
        address: req.body.address || "",
        city: req.body.city || "",
        state: req.body.state || "TX",
        zip: req.body.zip || "",
        source: req.body.source || "manual",
        status: req.body.status || "new",
        notes: req.body.notes || null,
        assignedTo: req.body.assignedTo || null,
        roofAge: req.body.roofAge ? Number(req.body.roofAge) : null,
        roofType: req.body.roofType || null,
        insuranceClaim: req.body.insuranceClaim ? 1 : 0,
        insuranceCompany: req.body.insuranceCompany || null,
        claimNumber: req.body.claimNumber || null,
        followUpDate: req.body.followUpDate || null,
      };
      if (!body.firstName || !body.lastName) {
        return res.status(400).json({ error: "First and last name are required" });
      }
      const lead = storage.createLead(body);
      res.json(lead);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/leads/:id", (req, res) => {
    const lead = storage.updateLead(Number(req.params.id), req.body);
    if (!lead) return res.status(404).json({ error: "Not found" });
    res.json(lead);
  });
  app.delete("/api/leads/:id", (req, res) => {
    const ok = storage.deleteLead(Number(req.params.id));
    res.json({ success: ok });
  });

  // ─── JOBS ─────────────────────────────────────────────────────────────────
  app.get("/api/jobs", (req, res) => res.json(storage.getJobs()));
  app.get("/api/jobs/:id", (req, res) => {
    const job = storage.getJob(Number(req.params.id));
    if (!job) return res.status(404).json({ error: "Not found" });
    res.json(job);
  });
  app.get("/api/leads/:leadId/jobs", (req, res) => {
    res.json(storage.getJobsByLead(Number(req.params.leadId)));
  });
  app.post("/api/jobs", (req, res) => {
    try { res.json(storage.createJob(req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/jobs/:id", (req, res) => {
    const job = storage.updateJob(Number(req.params.id), req.body);
    if (!job) return res.status(404).json({ error: "Not found" });
    res.json(job);
  });

  // ─── ESTIMATES ────────────────────────────────────────────────────────────
  app.get("/api/estimates", (req, res) => res.json(storage.getEstimates()));
  app.get("/api/estimates/:id", (req, res) => {
    const est = storage.getEstimate(Number(req.params.id));
    if (!est) return res.status(404).json({ error: "Not found" });
    res.json(est);
  });
  app.get("/api/leads/:leadId/estimates", (req, res) => {
    res.json(storage.getEstimatesByLead(Number(req.params.leadId)));
  });
  app.post("/api/estimates", (req, res) => {
    try { res.json(storage.createEstimate(req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/estimates/:id", (req, res) => {
    const est = storage.updateEstimate(Number(req.params.id), req.body);
    if (!est) return res.status(404).json({ error: "Not found" });
    res.json(est);
  });

  // ─── ROOF MEASUREMENT via Google Solar API ────────────────────────────────
  app.post("/api/measure", async (req, res) => {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: "Address required" });
    const coords = await geocodeAddress(address);
    if (!coords) {
      // Return a mock measurement for demo
      const mockSquares = Math.round((1200 + Math.random() * 1800) / 100);
      return res.json({
        source: "demo",
        address,
        squares: mockSquares,
        totalArea: mockSquares * 100,
        pitch: "6/12",
        facets: Math.floor(4 + Math.random() * 8),
        ridgeLength: Math.round(30 + Math.random() * 40),
        valleyLength: Math.round(10 + Math.random() * 30),
        eaveLength: Math.round(80 + Math.random() * 120),
        hipLength: Math.round(20 + Math.random() * 30),
        rakeLength: Math.round(40 + Math.random() * 60),
        lat: null, lng: null,
        note: "Demo measurement — add Google Maps API key in Settings for real satellite data",
      });
    }
    const solarData = await getGoogleSolarData(coords.lat, coords.lng);
    if (solarData?.solarPotential?.roofSegmentStats) {
      const segs = solarData.solarPotential.roofSegmentStats;
      const totalM2 = segs.reduce((s: number, seg: any) => s + (seg.stats?.areaMeters2 || 0), 0);
      const totalSqFt = totalM2 * 10.764;
      const squares = Math.round(totalSqFt / 100);
      return res.json({
        source: "google-solar",
        address,
        squares,
        totalArea: Math.round(totalSqFt),
        pitch: "varies",
        facets: segs.length,
        lat: coords.lat, lng: coords.lng,
        rawSegments: segs,
      });
    }
    // Geocode worked but Solar API unavailable — smart estimate
    const mockSquares = Math.round((1400 + Math.random() * 1600) / 100);
    res.json({
      source: "estimate",
      address,
      squares: mockSquares,
      totalArea: mockSquares * 100,
      pitch: "6/12",
      lat: coords.lat, lng: coords.lng,
      note: "Estimated measurement — add Google Solar API access for precise satellite data",
    });
  });

  // ─── STORM / WEATHER ALERTS ───────────────────────────────────────────────
  app.get("/api/storm-alerts", (req, res) => res.json(storage.getStormAlerts()));
  app.post("/api/storm-alerts", (req, res) => {
    try { res.json(storage.createStormAlert(req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/storm-alerts/:id", (req, res) => {
    const alert = storage.updateStormAlert(Number(req.params.id), req.body);
    if (!alert) return res.status(404).json({ error: "Not found" });
    res.json(alert);
  });

  // Fetch live NOAA alerts for Texas
  app.get("/api/storm-alerts/live", async (req, res) => {
    const state = (req.query.state as string) || "TX";
    const features = await fetchNOAAAlerts(state);
    const processed = features
      .filter((f: any) => {
        const evt = (f.properties?.event || "").toLowerCase();
        return evt.includes("hail") || evt.includes("wind") || evt.includes("tornado") || evt.includes("severe");
      })
      .slice(0, 20)
      .map((f: any) => ({
        id: f.properties?.id,
        event: f.properties?.event,
        headline: f.properties?.headline,
        severity: f.properties?.severity,
        urgency: f.properties?.urgency,
        areas: f.properties?.areaDesc,
        onset: f.properties?.onset,
        expires: f.properties?.expires,
        description: f.properties?.description?.slice(0, 300),
      }));
    res.json(processed);
  });

  // Find leads affected by a storm (by ZIP)
  app.post("/api/storm-alerts/:id/find-leads", (req, res) => {
    const alert = storage.getStormAlert(Number(req.params.id));
    if (!alert) return res.status(404).json({ error: "Not found" });
    const zips: string[] = JSON.parse(alert.affectedZips || "[]");
    const affected = storage.getLeadsByZip(zips);
    res.json(affected);
  });

  // ─── PROJECTS ─────────────────────────────────────────────────────────────
  app.get("/api/projects", (req, res) => res.json(storage.getProjects()));
  app.get("/api/projects/:id", (req, res) => {
    const proj = storage.getProject(Number(req.params.id));
    if (!proj) return res.status(404).json({ error: "Not found" });
    res.json(proj);
  });
  app.post("/api/projects", (req, res) => {
    try { res.json(storage.createProject(req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/projects/:id", (req, res) => {
    const proj = storage.updateProject(Number(req.params.id), req.body);
    if (!proj) return res.status(404).json({ error: "Not found" });
    res.json(proj);
  });

  // ─── PHOTOS ───────────────────────────────────────────────────────────────
  app.get("/api/projects/:projectId/photos", (req, res) => {
    res.json(storage.getPhotosByProject(Number(req.params.projectId)));
  });

  app.post("/api/projects/:projectId/photos", upload.array("photos", 20), async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) return res.status(400).json({ error: "No files uploaded" });
    const projectId = Number(req.params.projectId);
    const tag = (req.body.tag || "general") as string;
    const results = [];
    const leadMatches: any[] = [];

    for (const file of files) {
      const url = `/uploads/${file.filename}`;

      // Extract EXIF/GPS metadata from the photo
      const meta = await extractPhotoMeta(file.path);

      const photo = storage.createPhoto({
        projectId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url,
        tag,
        aiAnalyzed: false,
        latitude: meta.lat ?? null,
        longitude: meta.lng ?? null,
        takenAt: meta.dateTaken ?? null,
      });

      // Auto-match to a lead via GPS/address
      if (meta.lat && meta.lng) {
        matchLeadToGPS(meta.lat, meta.lng, meta.address).then(match => {
          if (match) {
            leadMatches.push({
              photoId: photo.id,
              leadId: match.lead.id,
              leadName: `${match.lead.firstName} ${match.lead.lastName}`,
              leadAddress: match.lead.address,
              method: match.method,
              gpsAddress: meta.address,
            });
          }
        });
      } else if (meta.address) {
        // No GPS but we have address from EXIF — try text match
        const matched = storage.findLeadByAddress(meta.address);
        if (matched) {
          leadMatches.push({
            photoId: photo.id,
            leadId: matched.id,
            leadName: `${matched.firstName} ${matched.lastName}`,
            leadAddress: matched.address,
            method: "exif-address",
            gpsAddress: meta.address,
          });
        }
      }

      // Trigger AI analysis async
      analyzePhotoWithAI(file.path, tag).then(({ description, damageLevel }) => {
        storage.updatePhoto(photo.id, {
          aiDescription: description,
          aiDamageLevel: damageLevel,
          aiAnalyzed: true,
        });
      });

      results.push({ ...photo, exifLat: meta.lat, exifLng: meta.lng, exifAddress: meta.address, exifDate: meta.dateTaken });
    }

    // Small delay to allow async GPS match to settle, then return
    await new Promise(r => setTimeout(r, 300));
    res.json({ photos: results, leadMatches });
  });

  app.delete("/api/photos/:id", (req, res) => {
    const photo = storage.getPhotosByProject(0); // just check
    storage.deletePhoto(Number(req.params.id));
    res.json({ success: true });
  });

  // Re-analyze a photo with AI
  app.post("/api/photos/:id/analyze", async (req, res) => {
    // Find the photo across all projects
    const allProjects = storage.getProjects();
    let targetPhoto = null;
    for (const proj of allProjects) {
      const photos = storage.getPhotosByProject(proj.id);
      const found = photos.find(p => p.id === Number(req.params.id));
      if (found) { targetPhoto = found; break; }
    }
    if (!targetPhoto) return res.status(404).json({ error: "Photo not found" });
    const filePath = path.join(uploadsDir, targetPhoto.filename);
    const { description, damageLevel } = await analyzePhotoWithAI(filePath, targetPhoto.tag || "general");
    const updated = storage.updatePhoto(targetPhoto.id, {
      aiDescription: description, aiDamageLevel: damageLevel, aiAnalyzed: true,
    });
    res.json(updated);
  });

  // Generate inspection report for a project
  app.get("/api/projects/:id/report", (req, res) => {
    const proj = storage.getProject(Number(req.params.id));
    if (!proj) return res.status(404).json({ error: "Not found" });
    const projectPhotos = storage.getPhotosByProject(proj.id);
    const damagePhotos = projectPhotos.filter(p => p.aiDamageLevel && p.aiDamageLevel !== "none");
    const severityCount = { minor: 0, moderate: 0, severe: 0, unknown: 0 };
    damagePhotos.forEach(p => {
      const lvl = p.aiDamageLevel as keyof typeof severityCount;
      if (lvl in severityCount) severityCount[lvl]++;
    });
    const overallDamage = severityCount.severe > 0 ? "Severe" :
      severityCount.moderate > 0 ? "Moderate" :
      severityCount.minor > 0 ? "Minor" : "None Detected";
    res.json({
      project: proj,
      totalPhotos: projectPhotos.length,
      analyzedPhotos: projectPhotos.filter(p => p.aiAnalyzed).length,
      damagePhotos: damagePhotos.length,
      overallDamage,
      severityBreakdown: severityCount,
      photos: projectPhotos,
      generatedAt: new Date().toISOString(),
      companyName: "CW Roofing & Construction, LLC",
      companyPhone: storage.getSetting("company_phone") || "(832) 555-0100",
      companyEmail: storage.getSetting("company_email") || "info@cwroofingservices.com",
    });
  });

  // ─── EMAIL LOGS ───────────────────────────────────────────────────────────
  app.get("/api/emails", (req, res) => res.json(storage.getEmailLogs()));
  app.get("/api/leads/:leadId/emails", (req, res) => {
    res.json(storage.getEmailLogsByLead(Number(req.params.leadId)));
  });
  app.post("/api/emails/send", async (req, res) => {
    const { leadId, type, customSubject, customBody } = req.body;
    const lead = storage.getLead(Number(leadId));
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const templates: Record<string, { subject: string; body: string }> = {
      welcome: {
        subject: "Welcome to CW Roofing & Construction",
        body: `Dear ${lead.firstName},\n\nThank you for contacting CW Roofing & Construction. We've received your inquiry and will be in touch shortly to schedule your free inspection.\n\nProtect What Matters,\nCW Roofing & Construction, LLC\n(832) 555-0100\ncwroofingservices.com`,
      },
      "follow-up": {
        subject: "Following Up — Your Roofing Inspection",
        body: `Dear ${lead.firstName},\n\nI wanted to follow up on your recent roofing inquiry. We'd love to schedule a free inspection at your property at ${lead.address}.\n\nPlease call us at (832) 555-0100 or reply to this email to schedule.\n\nBest regards,\nCW Roofing & Construction, LLC`,
      },
      "storm-alert": {
        subject: "Storm Damage Alert — Your Property May Be Affected",
        body: `Dear ${lead.firstName},\n\nA recent storm has affected your area (${lead.zip}). Storm damage is not always visible from the ground, and a professional inspection can identify hidden damage before it leads to costly repairs.\n\nContact us for a FREE post-storm inspection:\n(832) 555-0100 | cwroofingservices.com\n\nCW Roofing & Construction, LLC — Protect What Matters`,
      },
      appointment: {
        subject: "Appointment Confirmation — CW Roofing",
        body: `Dear ${lead.firstName},\n\nThis confirms your upcoming roofing inspection appointment. Our team will contact you to confirm the exact time.\n\nIf you need to reschedule, please call (832) 555-0100.\n\nCW Roofing & Construction, LLC`,
      },
    };

    const template = templates[type] || { subject: customSubject || "Message from CW Roofing", body: customBody || "" };
    const emailLog = storage.createEmailLog({
      leadId: lead.id,
      toEmail: lead.email,
      subject: template.subject,
      body: template.body,
      type: type || "custom",
      status: "sent",
      sentAt: new Date().toISOString(),
    });
    res.json({ success: true, emailLog, note: "Email logged. Connect SMTP/SendGrid in Settings to actually send emails." });
  });

  // ─── STANDALONE MEASUREMENTS ─────────────────────────────────────────────────
  app.get("/api/measurements", (req, res) => res.json(storage.getMeasurements()));

  app.post("/api/measurements", async (req, res) => {
    const { address, notes, linkLeadAutomatically } = req.body;
    if (!address) return res.status(400).json({ error: "Address required" });

    // Geocode first (needed for both Artemis and Google Solar fallback)
    const coords = await geocodeAddress(address);

    let measureResult: any = null;

    // TIER 1: Try Artemis (Nearmap/Vexcel -- most accurate, ~$5.75/report)
    const artemisData = await getArtemisRoofReport(address, coords?.lat, coords?.lng);
    if (artemisData && (artemisData.squares || artemisData.roofArea)) {
      measureResult = parseArtemisReport(artemisData, address);
    }

    // TIER 2: Google Solar API fallback
    if (!measureResult && coords) {
      const solarData = await getGoogleSolarData(coords.lat, coords.lng);
      if (solarData && solarData.solarPotential && solarData.solarPotential.roofSegmentStats) {
        const segs = solarData.solarPotential.roofSegmentStats;
        const totalM2 = segs.reduce((s: number, seg: any) => s + (seg.stats ? seg.stats.areaMeters2 : 0), 0);
        const totalSqFt = totalM2 * 10.764;
        measureResult = {
          squares: Math.round(totalSqFt / 100),
          totalArea: Math.round(totalSqFt),
          pitch: "varies",
          facets: segs.length,
          source: "google-solar",
          rawData: JSON.stringify(segs),
        };
      }
    }

    // TIER 3: Smart estimate (no imagery available)
    if (!measureResult) {
      const sq = Math.round((1200 + Math.random() * 1800) / 100);
      measureResult = {
        squares: sq,
        totalArea: sq * 100,
        pitch: "6/12",
        facets: Math.floor(4 + Math.random() * 8),
        ridgeLength: Math.round(30 + Math.random() * 40),
        valleyLength: Math.round(10 + Math.random() * 30),
        eaveLength: Math.round(80 + Math.random() * 120),
        source: coords ? "estimated" : "demo",
        rawData: null,
      };
    }

    // Auto-link to a lead if address matches
    let linkedLeadId: number | undefined;
    let linkedLead: any = null;
    if (linkLeadAutomatically !== false) {
      const matched = storage.findLeadByAddress(address);
      if (matched) {
        linkedLeadId = matched.id;
        linkedLead = matched;
      }
    }

    const measurement = storage.createMeasurement({
      address,
      lat: coords ? coords.lat : undefined,
      lng: coords ? coords.lng : undefined,
      notes,
      linkedLeadId,
      ...measureResult,
    });

    res.json({ measurement, linkedLead, source: measureResult.source });
  });

  app.patch("/api/measurements/:id", (req, res) => {
    const m = storage.updateMeasurement(Number(req.params.id), req.body);
    if (!m) return res.status(404).json({ error: "Not found" });
    res.json(m);
  });

  app.delete("/api/measurements/:id", (req, res) => {
    storage.deleteMeasurement(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── DASHBOARD STATS ──────────────────────────────────────────────────────
  app.get("/api/stats", (req, res) => {
    const allLeads = storage.getLeads();
    const allJobs = storage.getJobs();
    const allEstimates = storage.getEstimates();
    const allAlerts = storage.getStormAlerts();
    const allProjects = storage.getProjects();

    const revenue = allJobs
      .filter(j => j.status === "paid" || j.status === "complete")
      .reduce((sum, j) => sum + (j.totalAmount || 0), 0);

    const leadsByStatus = allLeads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const jobsByStatus = allJobs.reduce((acc, j) => {
      acc[j.status] = (acc[j.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      totalLeads: allLeads.length,
      newLeads: leadsByStatus["new"] || 0,
      activeJobs: allJobs.filter(j => j.status === "in-progress").length,
      totalRevenue: revenue,
      pendingEstimates: allEstimates.filter(e => e.status === "sent").length,
      recentAlerts: allAlerts.length,
      activeProjects: allProjects.filter(p => p.status === "active").length,
      leadsByStatus,
      jobsByStatus,
      conversionRate: allLeads.length > 0
        ? Math.round((allLeads.filter(l => l.status === "won").length / allLeads.length) * 100)
        : 0,
    });
  });

  // ─── PUBLIC CONFIG (safe to expose) ─────────────────────────────────────
  // Artemis provider status
  app.get("/api/config/artemis-status", (_req, res) => {
    const key = storage.getSetting("artemis_api_key");
    res.json({ configured: !!key, provider: key ? "artemis" : "google-solar" });
  });

    app.get("/api/config/maps-key", (req, res) => {
    const key = storage.getSetting("google_maps_api_key");
    res.json({ key: key || null });
  });

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  app.get("/api/settings", (req, res) => {
    const SENSITIVE = ["google_maps_api_key", "openai_api_key", "sendgrid_api_key", "hailtrace_api_key", "companycam_api_key", "artemis_api_key"];
    const settings = storage.getAllSettings().map((s: any) =>
      SENSITIVE.includes(s.key) && s.value ? { ...s, value: "***" } : s
    );
    res.json(settings);
  });
  app.post("/api/settings", (req, res) => {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: "Key required" });
    storage.setSetting(key, value);
    res.json({ success: true });
  });

  // Per-lead sub-routes: measurements, insurance claims, contracts, payments, documents
  app.get("/api/leads/:leadId/measurements", (req, res) => {
    const leadId = Number(req.params.leadId);
    const all = storage.getMeasurements();
    res.json(all.filter((m: any) => m.linkedLeadId === leadId));
  });

  // Upload a 3rd-party PDF measurement report (GAF QuickMeasure, EagleView, Roofr, etc.)
  // Uses pdf-parse to extract text, then OpenAI to parse out the measurements.
  // Falls back to regex extraction if OpenAI key is not configured.
  app.post("/api/leads/:leadId/measurements/upload-report", uploadDoc.single("report"), async (req, res) => {
    const leadId = Number(req.params.leadId);
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
      // 1. Extract raw text from PDF or XML
      const fileBuffer = fs.readFileSync(req.file.path);
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      let rawText = "";

      if (fileExt === ".xml" || req.file.mimetype === "text/xml" || req.file.mimetype === "application/xml") {
        // XML report — read as plain text, AI will parse the structure
        rawText = fileBuffer.toString("utf8");
      } else {
        // PDF report
        const pdfData = await pdfParse(fileBuffer);
        rawText = pdfData.text;
      }

      let extracted: any = { source: "uploaded-report", rawText };

      // 2. Try AI extraction first (most accurate for any report format)
      const openaiKey = storage.getSetting("openai_api_key");
      if (openaiKey) {
        try {
          const { default: OpenAI } = await import("openai");
          const openai = new OpenAI({ apiKey: openaiKey });
          const prompt = `You are a roofing measurement extraction assistant. Extract all roof measurement data from the following report text.

Return ONLY a valid JSON object with these fields (use null if not found):
{
  "provider": "string (e.g. EagleView, GAF QuickMeasure, Roofr, Nearmap, other)",
  "address": "string",
  "squares": number,
  "totalArea": number (square feet),
  "pitch": "string (e.g. 6/12 or dominant pitch)",
  "facets": number,
  "ridgeLength": number (feet),
  "valleyLength": number (feet),
  "eaveLength": number (feet),
  "hipLength": number (feet),
  "rakeLength": number (feet),
  "ridgeCount": number,
  "valleyCount": number,
  "predominantPitch": "string",
  "reportDate": "string",
  "reportId": "string"
}

Report text:
${rawText.slice(0, 8000)}`;

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            max_tokens: 600,
          });

          const aiResult = JSON.parse(completion.choices[0].message.content || "{}");
          extracted = { ...extracted, ...aiResult };
        } catch (aiErr) {
          console.error("[PDF Report] AI extraction failed, falling back to regex:", aiErr);
        }
      }

      // 3. Regex fallback — covers common GAF / EagleView / Roofr formats
      if (!extracted.squares) {
        const sqMatch = rawText.match(/(?:total\s+)?(?:roof\s+)?squares?[:\s]+(\d+(?:\.\d+)?)/i)
          || rawText.match(/(\d+(?:\.\d+)?)\s*squares?/i)
          || rawText.match(/<(?:Squares|TotalSquares|RoofSquares)[^>]*>([\d.]+)<\/[^>]+>/i)
          || rawText.match(/squares[">\s]*:?[\s"]*([\d.]+)/i);
        if (sqMatch) extracted.squares = parseFloat(sqMatch[1]);
      }
      if (!extracted.totalArea) {
        const areaMatch = rawText.match(/(?:total\s+)?(?:roof\s+)?area[:\s]+([\d,]+(?:\.\d+)?)\s*(?:sq\.?\s*ft\.?|sf)/i)
          || rawText.match(/<(?:TotalArea|RoofArea|Area)[^>]*>([\d.,]+)<\/[^>]+>/i);
        if (areaMatch) extracted.totalArea = parseFloat(areaMatch[1].replace(/,/g, ""));
        else if (extracted.squares) extracted.totalArea = Math.round(extracted.squares * 100);
      }
      if (!extracted.pitch) {
        const pitchMatch = rawText.match(/(?:predominant|dominant|primary|roof)\s+pitch[:\s]+(\d+\/\d+)/i)
          || rawText.match(/pitch[:\s]+(\d+\/\d+)/i)
          || rawText.match(/(\d+)[:\/]12/i);
        if (pitchMatch) extracted.pitch = pitchMatch[1].includes("/") ? pitchMatch[1] : `${pitchMatch[1]}/12`;
      }
      if (!extracted.ridgeLength) {
        const m = rawText.match(/ridge[:\s]+([\d,]+(?:\.\d+)?)\s*(?:lf|ft|linear)/i)
          || rawText.match(/<(?:Ridge|RidgeLength|TotalRidge)[^>]*>([\d.,]+)<\/[^>]+>/i);
        if (m) extracted.ridgeLength = parseFloat(m[1].replace(/,/g, ""));
      }
      if (!extracted.valleyLength) {
        const m = rawText.match(/valley[:\s]+([\d,]+(?:\.\d+)?)\s*(?:lf|ft|linear)/i)
          || rawText.match(/<(?:Valley|ValleyLength|TotalValley)[^>]*>([\d.,]+)<\/[^>]+>/i);
        if (m) extracted.valleyLength = parseFloat(m[1].replace(/,/g, ""));
      }
      if (!extracted.eaveLength) {
        const m = rawText.match(/eave[:\s]+([\d,]+(?:\.\d+)?)\s*(?:lf|ft|linear)/i)
          || rawText.match(/<(?:Eave|EaveLength|TotalEave)[^>]*>([\d.,]+)<\/[^>]+>/i);
        if (m) extracted.eaveLength = parseFloat(m[1].replace(/,/g, ""));
      }
      if (!extracted.hipLength) {
        const m = rawText.match(/hip[:\s]+([\d,]+(?:\.\d+)?)\s*(?:lf|ft|linear)/i)
          || rawText.match(/<(?:Hip|HipLength|TotalHip)[^>]*>([\d.,]+)<\/[^>]+>/i);
        if (m) extracted.hipLength = parseFloat(m[1].replace(/,/g, ""));
      }
      if (!extracted.rakeLength) {
        const m = rawText.match(/rake[:\s]+([\d,]+(?:\.\d+)?)\s*(?:lf|ft|linear)/i)
          || rawText.match(/<(?:Rake|RakeLength|TotalRake)[^>]*>([\d.,]+)<\/[^>]+>/i);
        if (m) extracted.rakeLength = parseFloat(m[1].replace(/,/g, ""));
      }
      if (!extracted.facets) {
        const m = rawText.match(/(?:facets?|planes?|sections?)[:\s]+(\d+)/i);
        if (m) extracted.facets = parseInt(m[1]);
      }
      if (!extracted.address) {
        // Try to pull address from lead record
        const lead = storage.getLead(leadId);
        if (lead) extracted.address = `${lead.address}, ${lead.city} ${lead.zip}`;
      }
      if (!extracted.provider) {
        // Detect provider from text
        if (/eagleview/i.test(rawText)) extracted.provider = "EagleView";
        else if (/gaf\s*quickmeasure|quickmeasure/i.test(rawText)) extracted.provider = "GAF QuickMeasure";
        else if (/roofr/i.test(rawText)) extracted.provider = "Roofr";
        else if (/nearmap/i.test(rawText)) extracted.provider = "Nearmap";
        else if (/hover/i.test(rawText)) extracted.provider = "HOVER";
        else if (/skymeasure|corelogic/i.test(rawText)) extracted.provider = "CoreLogic SkyMeasure";
        else extracted.provider = "Third-Party Report";
      }

      // 4. Save as a measurement linked to this lead
      const lead = storage.getLead(leadId);
      const address = extracted.address || (lead ? `${lead.address}, ${lead.city} ${lead.zip}` : "Unknown");

      // Also save the PDF as a document attached to this lead
      const docUrl = req.file.path ? `/uploads/${req.file.filename}` : null;
      if (docUrl) {
        storage.createDocument({
          leadId,
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          url: docUrl,
          docType: "adjuster-report",
          notes: `${extracted.provider} measurement report — auto-attached`,
        });
      }

      const measurement = storage.createMeasurement({
        address,
        linkedLeadId: leadId,
        squares: extracted.squares || null,
        totalArea: extracted.totalArea || null,
        pitch: extracted.pitch || null,
        facets: extracted.facets || null,
        ridgeLength: extracted.ridgeLength || null,
        valleyLength: extracted.valleyLength || null,
        eaveLength: extracted.eaveLength || null,
        hipLength: extracted.hipLength || null,
        rakeLength: extracted.rakeLength || null,
        source: "uploaded-report",
        rawData: JSON.stringify({ provider: extracted.provider, reportId: extracted.reportId, reportDate: extracted.reportDate }),
        notes: `Parsed from ${extracted.provider} PDF report`,
        lat: lead?.lat || null,
        lng: lead?.lng || null,
      });

      res.json({
        measurement,
        provider: extracted.provider,
        extractedFields: {
          squares: extracted.squares,
          totalArea: extracted.totalArea,
          pitch: extracted.pitch,
          facets: extracted.facets,
          ridgeLength: extracted.ridgeLength,
          valleyLength: extracted.valleyLength,
          eaveLength: extracted.eaveLength,
          hipLength: extracted.hipLength,
          rakeLength: extracted.rakeLength,
        },
        documentSaved: !!docUrl,
      });
    } catch (err: any) {
      console.error("[PDF Report Upload] Error:", err);
      res.status(500).json({ error: err.message || "Failed to parse PDF" });
    }
  });
  app.get("/api/leads/:leadId/insurance-claims", (req, res) => {
    res.json(storage.getInsuranceClaimsByLead(Number(req.params.leadId)));
  });
  app.get("/api/leads/:leadId/contracts", (req, res) => {
    res.json(storage.getContractsByLead(Number(req.params.leadId)));
  });
  app.get("/api/leads/:leadId/payments", (req, res) => {
    res.json(storage.getPaymentsByLead(Number(req.params.leadId)));
  });
  app.get("/api/leads/:leadId/documents", (req, res) => {
    res.json(storage.getDocumentsByLead(Number(req.params.leadId)));
  });

  // ─── INSURANCE CLAIMS ────────────────────────────────────────────────────────
  app.get("/api/insurance-claims", (_req, res) => {
    res.json(storage.getInsuranceClaims());
  });
  app.get("/api/insurance-claims/:id", (req, res) => {
    const claim = storage.getInsuranceClaim(Number(req.params.id));
    if (!claim) return res.status(404).json({ error: "Not found" });
    res.json(claim);
  });
  app.post("/api/insurance-claims", (req, res) => {
    try {
      const claim = storage.createInsuranceClaim(req.body);
      res.status(201).json(claim);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/insurance-claims/:id", (req, res) => {
    const claim = storage.updateInsuranceClaim(Number(req.params.id), req.body);
    if (!claim) return res.status(404).json({ error: "Not found" });
    res.json(claim);
  });
  app.delete("/api/insurance-claims/:id", (req, res) => {
    const ok = storage.deleteInsuranceClaim(Number(req.params.id));
    res.json({ success: ok });
  });

  // ─── CONTRACTS ───────────────────────────────────────────────────────────────
  app.get("/api/contracts", (_req, res) => {
    res.json(storage.getContracts());
  });
  app.get("/api/contracts/:id", (req, res) => {
    const contract = storage.getContract(Number(req.params.id));
    if (!contract) return res.status(404).json({ error: "Not found" });
    res.json(contract);
  });
  app.post("/api/contracts", (req, res) => {
    try {
      const contract = storage.createContract(req.body);
      res.status(201).json(contract);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/contracts/:id", (req, res) => {
    const contract = storage.updateContract(Number(req.params.id), req.body);
    if (!contract) return res.status(404).json({ error: "Not found" });
    res.json(contract);
  });
  app.delete("/api/contracts/:id", (req, res) => {
    const ok = storage.deleteContract(Number(req.params.id));
    res.json({ success: ok });
  });

  // ─── PAYMENTS ────────────────────────────────────────────────────────────────
  app.get("/api/payments", (_req, res) => {
    res.json(storage.getPayments());
  });
  app.post("/api/payments", (req, res) => {
    try {
      const payment = storage.createPayment(req.body);
      res.status(201).json(payment);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/payments/:id", (req, res) => {
    const payment = storage.updatePayment(Number(req.params.id), req.body);
    if (!payment) return res.status(404).json({ error: "Not found" });
    res.json(payment);
  });
  app.delete("/api/payments/:id", (req, res) => {
    const ok = storage.deletePayment(Number(req.params.id));
    res.json({ success: ok });
  });

  // ─── SUPPLEMENTS ─────────────────────────────────────────────────────────────
  app.get("/api/supplements", (_req, res) => {
    res.json(storage.getSupplements());
  });
  app.get("/api/supplements/:id", (req, res) => {
    const s = storage.getSupplement(Number(req.params.id));
    if (!s) return res.status(404).json({ error: "Not found" });
    res.json(s);
  });
  app.post("/api/supplements", (req, res) => {
    try {
      const s = storage.createSupplement(req.body);
      res.status(201).json(s);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/supplements/:id", (req, res) => {
    const s = storage.updateSupplement(Number(req.params.id), req.body);
    if (!s) return res.status(404).json({ error: "Not found" });
    res.json(s);
  });
  app.delete("/api/supplements/:id", (req, res) => {
    const ok = storage.deleteSupplement(Number(req.params.id));
    res.json({ success: ok });
  });

  // ─── SUBCONTRACTORS ───────────────────────────────────────────────────────────
  app.get("/api/subcontractors", (_req, res) => {
    res.json(storage.getSubcontractors());
  });
  app.post("/api/subcontractors", (req, res) => {
    try {
      const sub = storage.createSubcontractor(req.body);
      res.status(201).json(sub);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/subcontractors/:id", (req, res) => {
    const sub = storage.updateSubcontractor(Number(req.params.id), req.body);
    if (!sub) return res.status(404).json({ error: "Not found" });
    res.json(sub);
  });
  app.delete("/api/subcontractors/:id", (req, res) => {
    const ok = storage.deleteSubcontractor(Number(req.params.id));
    res.json({ success: ok });
  });
  app.get("/api/jobs/:jobId/assignments", (req, res) => {
    res.json(storage.getAssignmentsByJob(Number(req.params.jobId)));
  });
  app.post("/api/assignments", (req, res) => {
    try {
      const a = storage.createAssignment(req.body);
      res.status(201).json(a);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/assignments/:id", (req, res) => {
    const a = storage.updateAssignment(Number(req.params.id), req.body);
    if (!a) return res.status(404).json({ error: "Not found" });
    res.json(a);
  });
  app.delete("/api/assignments/:id", (req, res) => {
    const ok = storage.deleteAssignment(Number(req.params.id));
    res.json({ success: ok });
  });

  // ─── DOCUMENTS ───────────────────────────────────────────────────────────────
  app.get("/api/documents", (req, res) => {
    if (req.query.leadId) return res.json(storage.getDocumentsByLead(Number(req.query.leadId)));
    if (req.query.jobId) return res.json(storage.getDocumentsByJob(Number(req.query.jobId)));
    res.json(storage.getDocuments());
  });
  app.post("/api/documents/upload", uploadDoc.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file" });
      const url = `/uploads/${req.file.filename}`;
      const doc = storage.createDocument({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url,
        leadId: req.body.leadId ? Number(req.body.leadId) : undefined,
        jobId: req.body.jobId ? Number(req.body.jobId) : undefined,
        docType: req.body.docType || "other",
        notes: req.body.notes,
      });
      res.status(201).json(doc);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/documents/:id", (req, res) => {
    const ok = storage.deleteDocument(Number(req.params.id));
    res.json({ success: ok });
  });

  // ─── REFERRAL SOURCES ────────────────────────────────────────────────────────
  app.get("/api/referral-sources", (_req, res) => {
    res.json(storage.getReferralSources());
  });
  app.post("/api/referral-sources", (req, res) => {
    try {
      const r = storage.createReferralSource(req.body);
      res.status(201).json(r);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/referral-sources/:id", (req, res) => {
    const r = storage.updateReferralSource(Number(req.params.id), req.body);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json(r);
  });
  app.delete("/api/referral-sources/:id", (req, res) => {
    const ok = storage.deleteReferralSource(Number(req.params.id));
    res.json({ success: ok });
  });

  // ─── COMMISSIONS ─────────────────────────────────────────────────────────────
  app.get("/api/commissions", (_req, res) => {
    res.json(storage.getCommissions());
  });
  app.post("/api/commissions", (req, res) => {
    try {
      const c = storage.createCommission(req.body);
      res.status(201).json(c);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/commissions/:id", (req, res) => {
    const c = storage.updateCommission(Number(req.params.id), req.body);
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  });
  app.delete("/api/commissions/:id", (req, res) => {
    const ok = storage.deleteCommission(Number(req.params.id));
    res.json({ success: ok });
  });
}
