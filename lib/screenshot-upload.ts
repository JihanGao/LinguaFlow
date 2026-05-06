import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Persists an uploaded screenshot for the tutor flow.
 * - Production (Vercel): set `BLOB_READ_WRITE_TOKEN` → uploads go to Vercel Blob; DB stores the public HTTPS URL.
 * - Local dev: omit token → files go to `public/uploads`; DB stores `/uploads/...`.
 */
export async function persistTutorScreenshot(file: File): Promise<{
  publicPath: string;
  dataUrl: string;
}> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/png";
  const dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    const { put } = await import("@vercel/blob");
    const ext = path.extname(file.name).replace(/[^.a-zA-Z0-9]/g, "") || ".png";
    const pathname = `screenshots/${Date.now()}-${randomUUID()}${ext}`;
    const blob = await put(pathname, bytes, {
      access: "public",
      token,
      contentType: mime
    });
    return { publicPath: blob.url, dataUrl };
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const ext = path.extname(file.name) || ".png";
  const filename = `${Date.now()}-${randomUUID()}${ext}`;
  await writeFile(path.join(uploadsDir, filename), bytes);

  return {
    publicPath: `/uploads/${filename}`,
    dataUrl
  };
}
