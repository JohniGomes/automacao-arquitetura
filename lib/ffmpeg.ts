import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

const RUN_TIMEOUT = 10 * 60_000;

function run(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg-static indisponível nesta plataforma"));
    const p = spawn(ffmpegPath, ["-y", "-loglevel", "error", ...args]);
    let err = "";
    // sem limite de tempo um ffmpeg travado prenderia o job (e uma vaga da fila) para sempre
    const timer = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("ffmpeg: tempo esgotado")); }, RUN_TIMEOUT);
    p.stderr.on("data", (d) => (err += d));
    p.on("error", (e) => { clearTimeout(timer); reject(e); });
    p.on("close", (c) => { clearTimeout(timer); c === 0 ? resolve() : reject(new Error("ffmpeg: " + err.slice(-400))); });
  });
}

/** Pasta temporária apagada sempre, com sucesso ou erro. */
async function withTmp<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "aia-"));
  try { return await fn(d); }
  finally { fs.rmSync(d, { recursive: true, force: true }); }
}

/** Clipe "Ken Burns" 1920x1080 a partir de uma imagem (modo mock e cena cujo vídeo de IA falhou). */
export function imageToClip(img: Buffer, seconds: number): Promise<Buffer> {
  return withTmp(async (d) => {
    fs.writeFileSync(path.join(d, "i.png"), img);
    const frames = Math.round(seconds * 24);
    await run(["-i", path.join(d, "i.png"), "-vf",
      `scale=3840:-2,zoompan=z='min(zoom+0.0012,1.25)':d=${frames}:s=1920x1080:fps=24,format=yuv420p`,
      "-t", String(seconds), "-c:v", "libx264", "-an", path.join(d, "o.mp4")]);
    return fs.readFileSync(path.join(d, "o.mp4"));
  });
}

/** Junta clipes (cortados a `seconds` só se > 0; senão inteiros) em um único MP4 1920x1080, 24 fps, sem áudio. */
export function concatClips(clips: Buffer[], seconds: number): Promise<Buffer> {
  return withTmp(async (d) => {
    const inputs: string[] = [];
    const filters: string[] = [];
    clips.forEach((c, i) => {
      const f = path.join(d, `c${i}.mp4`);
      fs.writeFileSync(f, c);
      inputs.push("-i", f);
      filters.push(`[${i}:v]${seconds > 0 ? `trim=duration=${seconds},` : ""}setpts=PTS-STARTPTS,scale=1920:1080:flags=lanczos:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=24,setsar=1[v${i}]`);
    });
    const chain = clips.map((_, i) => `[v${i}]`).join("") + `concat=n=${clips.length}:v=1:a=0[out]`;
    const out = path.join(d, "final.mp4");
    await run([...inputs, "-filter_complex", filters.join(";") + ";" + chain, "-map", "[out]",
      "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
    return fs.readFileSync(out);
  });
}
