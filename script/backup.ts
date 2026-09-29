import "dotenv/config";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const source = path.resolve(process.env.SQLITE_DATABASE_PATH || "data.db");
const destination = process.argv[2] && path.resolve(process.argv[2]);

if (!destination || source === destination) {
  throw new Error("Usage: npm run db:backup -- /absolute/private/path/backup.db");
}
if (!fs.existsSync(source)) {
  throw new Error(`Database not found: ${source}`);
}
if (fs.existsSync(destination)) {
  throw new Error(`Refusing to overwrite existing backup: ${destination}`);
}
fs.mkdirSync(path.dirname(destination), { recursive: true });
const db = new Database(source, { readonly: true });
try {
  await db.backup(destination);
  const backup = new Database(destination, { readonly: true });
  try {
    const result = backup.pragma("integrity_check", { simple: true });
    if (result !== "ok") throw new Error(`Backup integrity check failed: ${result}`);
  } finally {
    backup.close();
  }
  console.log(`Verified SQLite backup: ${destination}`);
} finally {
  db.close();
}
