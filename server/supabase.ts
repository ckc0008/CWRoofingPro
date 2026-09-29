import { AsyncLocalStorage } from "node:async_hooks";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Express } from "express";

export type StaffRole = "admin" | "staff" | "viewer";
const context = new AsyncLocalStorage<{ client: SupabaseClient; role: StaffRole; userId: string }>();

export function publicConfiguration() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required.");
  return { url, publishableKey };
}
export function requestDatabase() {
  const current = context.getStore();
  if (!current) throw new Error("A verified staff session is required.");
  return current.client;
}
export function installAuthentication(app: Express) {
  const config = publicConfiguration();
  app.get("/api/auth/config", (_req, res) => res.json(config));
  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  app.use("/api", async (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return res.status(401).json({ error: "Please sign in." });
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return res.status(401).json({ error: "Invalid session token." });
    const client = createClient(config.url, config.publishableKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    const { data: member, error: membershipError } = await client.from("staff_members").select("role,active").eq("user_id", data.user.id).maybeSingle();
    if (membershipError) return res.status(503).json({ error: "Unable to verify staff access." });
    if (!member?.active) return res.status(403).json({ error: "Your account has not been granted CW Roofing staff access." });
    if (member.role === "viewer" && !["GET", "HEAD", "OPTIONS"].includes(req.method)) return res.status(403).json({ error: "Your account has read-only access." });
    if (req.path.startsWith("/settings") && req.method !== "GET" && member.role !== "admin") return res.status(403).json({ error: "Administrator access required." });
    context.run({ client, role: member.role, userId: data.user.id }, () => next());
  });
  app.get("/api/auth/me", (_req, res) => {
    const current = context.getStore()!;
    res.json({ userId: current.userId, role: current.role });
  });
}
