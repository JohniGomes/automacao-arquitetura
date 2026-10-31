import fs from "node:fs";
import path from "node:path";

export type GenType = "mapa" | "moodboard" | "render" | "luz" | "filme" | "melhorar" | "esboco" | "ideias" | "editor" | "angulos";
export type User = { id: string; email: string; name: string; passHash?: string; googleId?: string; credits: number; createdAt: string; termsAcceptedAt?: string; termsVersion?: string };
export type Output = { file: string; kind: "image" | "video"; label?: string };
export type Generation = {
  id: string; userId: string; type: GenType; status: "queued" | "running" | "done" | "error";
  progress: number; message: string; createdAt: string; finishedAt?: string;
  summary: string; prompt?: string; outputs: Output[]; cost: number; mock: boolean; error?: string;
  /** consumo real de API, para medir custos */
  usage: { images: number; videoClips: number };
  projectId?: string | null;
  favorite?: boolean;
  /** créditos já devolvidos durante o processamento (falha parcial); não vai para o banco */
  refunded?: number;
  /** pedido de cancelamento (só o filme para no meio); não vai para o banco */
  cancel?: boolean;
};
export type Project = { id: string; userId: string; name: string; createdAt: string };
export type Tx = { id: string; userId: string; delta: number; reason: string; genId?: string; at: string };
export type SupportMsg = { id: string; userId: string; email: string; subject: string; message: string; createdAt: string };
type DB = { users: User[]; generations: Generation[]; txs: Tx[]; projects: Project[]; support?: SupportMsg[] };

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data"); // no Render: disco persistente, ex. /var/data
const FILE = path.join(DATA_DIR, "db.json");

const g = globalThis as unknown as { __db?: DB };

export function db(): DB {
  if (g.__db) return g.__db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  g.__db = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : { users: [], generations: [], txs: [], projects: [] };
  g.__db!.projects ??= [];
  g.__db!.support ??= [];
  return g.__db!;
}
export function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db(), null, 2));
  fs.renameSync(tmp, FILE);
}
export const uid = () => crypto.randomUUID();
