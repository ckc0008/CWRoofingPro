import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

// Supply a current administrator access token through your shell's secret mechanism.
// Never add credentials or backup output to Git.
const destination = process.argv[2] && path.resolve(process.argv[2]);
const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!destination || !token || !url || !key) throw new Error("Usage: npm run db:backup -- /private/new-backup-directory; requires SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_ACCESS_TOKEN.");
const client = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
const { data: user, error: authError } = await client.auth.getUser(token);
if (authError || !user.user) throw new Error("A valid administrator session is required.");
const { data: member, error: memberError } = await client.from("staff_members").select("role,active").eq("user_id", user.user.id).single();
if (memberError || !member?.active || member.role !== "admin") throw new Error("Administrator access required.");
await mkdir(destination, { recursive: false, mode: 0o700 });
const tables = ["leads","jobs","estimates","storm_alerts","projects","photos","email_logs","measurements","settings","insurance_claims","contracts","payments","supplements","subcontractors","subcontractor_assignments","documents","referral_sources","commissions"];
const rows: Record<string, any[]> = {};
const files: { object: string; file: string; sha256: string; bytes: number }[] = [];
try {
  for (const table of tables) {
    rows[table] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await client.from(table).select("*").order("id").range(offset, offset + 499);
      if (error) throw error;
      rows[table].push(...data);
      if (data.length < 500) break;
    }
  }
  await mkdir(path.join(destination, "files"), { mode: 0o700 });
  const objects = [...new Set([...rows.photos, ...rows.documents].map(row => row.url).filter(url => url.startsWith("storage://")))];
  for (const object of objects) {
    const key = object.slice("storage://".length);
    const { data, error } = await client.storage.from("cw-company-files").download(key);
    if (error) throw error;
    const bytes = Buffer.from(await data.arrayBuffer());
    const filename = `${files.length.toString().padStart(6, "0")}.bin`;
    await writeFile(path.join(destination, "files", filename), bytes, { mode: 0o600 });
    files.push({ object, file: `files/${filename}`, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length });
  }
  await writeFile(path.join(destination, "backup.json"), JSON.stringify({ version: 1, createdAt: new Date().toISOString(), project: url, tables: rows, files }, null, 2), { mode: 0o600 });
  console.log(`Exported ${Object.values(rows).reduce((n, r) => n + r.length, 0)} records and ${files.length} files to ${destination}.`);
} catch (error) {
  // Keep incomplete exports clearly marked; never report a partial export as a backup.
  await writeFile(path.join(destination, "INCOMPLETE.txt"), "This export failed. Do not use it for recovery.\n", { mode: 0o600 });
  throw error;
}
