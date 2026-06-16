import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function saveUpload(file: File | null, prefix: string): Promise<{ localPath: string; originalName: string } | null> {
  if (!file || file.size === 0) return null;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const folder = path.join(process.cwd(), "uploads", prefix);
  const filename = `${Date.now()}-${safeName}`;
  const localPath = path.join(folder, filename);

  await mkdir(folder, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(localPath, buffer);

  return {
    localPath,
    originalName: file.name
  };
}
