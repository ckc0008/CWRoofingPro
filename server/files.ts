import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { requestDatabase } from "./supabase";

export const FILE_BUCKET = "cw-company-files";
const PREFIX = "storage://";
export async function uploadCompanyFile(file: Express.Multer.File): Promise<string> {
  const name = `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
  const bytes = await fs.readFile(file.path);
  const { error } = await requestDatabase().storage.from(FILE_BUCKET).upload(name, bytes, { contentType: file.mimetype, upsert: false });
  if (error) throw error;
  return PREFIX + name;
}
export async function signStoredFile(value: string): Promise<string> {
  if (!value.startsWith(PREFIX)) return value;
  const { data, error } = await requestDatabase().storage.from(FILE_BUCKET).createSignedUrl(value.slice(PREFIX.length), 3600);
  if (error) throw error;
  return data.signedUrl;
}
export async function downloadCompanyFile(key: string): Promise<Buffer> {
  const { data, error } = await requestDatabase().storage.from(FILE_BUCKET).download(key.replace(PREFIX, ""));
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}
