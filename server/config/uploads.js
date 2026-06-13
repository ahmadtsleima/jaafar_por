import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function normalizeUploadPath(value) {
  if (!value || typeof value !== "string") return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.startsWith("vimeo:")) return null;
  const cleaned = value
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "");

  if (!cleaned || cleaned.includes("..") || path.isAbsolute(cleaned)) return null;
  return cleaned;
}

function safeExtension(ext, fallback) {
  const candidate = (ext || fallback).toLowerCase();
  return /^\.[a-z0-9]+$/.test(candidate) ? candidate : fallback;
}

export function uploadUrl(relativePath) {
  const normalized = normalizeUploadPath(relativePath);
  return normalized ? `/uploads/${normalized}` : null;
}

export function mediaUrlFromRow(row) {
  if (!row) return row;
  if (typeof row.url === "string" && row.url.includes("player.vimeo.com")) return row;

  const localPath = normalizeUploadPath(row.file_path || row.r2_key || row.url);
  if (localPath) row.url = uploadUrl(localPath);
  return row;
}

export async function saveUploadFile(folder, id, ext, fallbackExt, buffer) {
  const relativePath = `${folder}/${id}${safeExtension(ext, fallbackExt)}`;
  const absolutePath = path.join(UPLOADS_DIR, relativePath);

  await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
  await fsp.writeFile(absolutePath, buffer);

  return {
    filePath: relativePath,
    url: uploadUrl(relativePath),
  };
}

export async function deleteUploadFile(value) {
  const relativePath = normalizeUploadPath(value);
  if (!relativePath) return false;

  const uploadsRoot = path.resolve(UPLOADS_DIR);
  const absolutePath = path.resolve(UPLOADS_DIR, relativePath);
  if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) return false;

  try {
    await fsp.unlink(absolutePath);
    return true;
  } catch (err) {
    if (err?.code === "ENOENT") return false;
    throw err;
  }
}
