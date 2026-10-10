import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const ALLOWED = new Set(["pdf", "png", "jpg", "jpeg", "webp", "doc", "docx"]);

export function safeDocumentName(name: string) {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const cleaned = base.replace(/^\.+/, "") || "document";
  const ext = cleaned.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED.has(ext)) return null;
  if (cleaned.includes("..") || cleaned.includes("/") || cleaned.includes("\\")) return null;
  return cleaned;
}

export function contentTypeFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}

export function isSafeObjectKey(provider: string, objectKey: string | null, storedName: string) {
  const raw = objectKey || storedName;
  if (!raw || raw.includes("..") || raw.includes("\\") || raw.startsWith("/") || raw.includes("://")) return false;
  if (provider === "blob") return raw.startsWith("apply/") && !raw.includes("?");
  if (provider === "local") return !raw.includes("/") && raw === path.basename(raw);
  return false;
}

export function privateStorageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function storeApplyFile(requestId: string, filename: string, bytes: Buffer) {
  const safeName = safeDocumentName(filename);
  if (!safeName) throw new Error("UNSUPPORTED_FILE");
  const objectKey = `apply/${requestId}/${Date.now()}-${safeName}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(objectKey, bytes, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: contentTypeFor(safeName),
      addRandomSuffix: true,
    });
    return { storageProvider: "blob", objectKey: blob.pathname, storedName: safeName };
  }
  if (process.env.VERCEL) throw new Error("PRIVATE_STORAGE_UNCONFIGURED");
  const dir = path.join(process.cwd(), "data", "apply-uploads");
  await mkdir(dir, { recursive: true });
  const storedName = path.basename(objectKey);
  await writeFile(path.join(dir, storedName), bytes);
  return { storageProvider: "local", objectKey: storedName, storedName };
}

export async function readApplyFile(provider: string, objectKey: string | null, storedName: string) {
  if (!isSafeObjectKey(provider, objectKey, storedName)) return null;
  if (provider === "blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN || !objectKey) return null;
    const { get } = await import("@vercel/blob");
    const result = await get(objectKey, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return { stream: result.stream, contentType: result.blob.contentType || contentTypeFor(storedName) };
  }
  if (provider !== "local" || process.env.VERCEL) return null;
  const key = path.basename(objectKey || storedName);
  const root = path.join(process.cwd(), "data", "apply-uploads");
  const filePath = path.join(root, key);
  if (path.dirname(filePath) !== root) return null;
  const bytes = await readFile(filePath);
  return { stream: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }), contentType: contentTypeFor(key) };
}

export async function deleteApplyFile(provider: string, objectKey: string | null, storedName: string) {
  if (!isSafeObjectKey(provider, objectKey, storedName)) return false;
  if (provider === "blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN || !objectKey) return false;
    const { del } = await import("@vercel/blob");
    await del(objectKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return true;
  }
  if (provider !== "local" || process.env.VERCEL) return false;
  const key = path.basename(objectKey || storedName);
  const root = path.join(process.cwd(), "data", "apply-uploads");
  const filePath = path.join(root, key);
  if (path.dirname(filePath) !== root) return false;
  const { unlink } = await import("fs/promises");
  try {
    await unlink(filePath);
  } catch {
    /* already gone */
  }
  return true;
}
