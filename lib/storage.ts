import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./db";

const dir = (userId: string) => path.join(DATA_DIR, "files", userId);
export function saveFile(userId: string, name: string, data: Buffer) {
  fs.mkdirSync(dir(userId), { recursive: true });
  fs.writeFileSync(path.join(dir(userId), name), data);
  return name;
}
export function filePath(userId: string, name: string) { return path.join(dir(userId), path.basename(name)); }
export function readFile(userId: string, name: string) {
  const p = filePath(userId, name);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}
export const mimeOf = (buf: Buffer) =>
  buf[0] === 0xff ? "image/jpeg" : buf.subarray(8, 12).toString() === "WEBP" ? "image/webp" : "image/png";
