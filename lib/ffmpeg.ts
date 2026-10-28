import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

function run(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg-static indisponível nesta plataforma"));
    const p = spawn(ffmpegPath, ["-y", "-loglevel", "error", ...args]);
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error("ffmpeg: " + err.slice(-400)))));
  });
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "aia-"));

/** Cria um clipe "Ken Burns" 1920x1080 a partir de uma imagem (usado só no modo mock). */
export async function imageToClip(img: Buffer, seconds: number): Promise<Buffer> {
  const d = tmp();
  fs.writeFileSync(path.join(d, "i.png"), img);
  const frames = Math.round(seconds * 24);
  await run(["-i", path.join(d, "i.png"), "-vf",
    `scale=3840:-2,zoompan=z='min(zoom+0.0012,1.25)':d=${frames}:s=1920x1080:fps=24,format=yuv420p`,
    "-t", String(seconds), "-c:v", "libx264", "-an", path.join(d, "o.mp4")]);
  const out = fs.readFileSync(path.join(d, "o.mp4"));
  fs.rmSync(d, { recursive: true, force: true });
  return out;
}

/** Junta clipes (cortados a `seconds`) em um único MP4 1920x1080, 24 fps, sem áudio. */
export async function concatClips(clips: Buffer[], seconds: number): Promise<Buffer> {
  const d = tmp();
  const inputs: string[] = [];
  const filters: string[] = [];
  clips.forEach((c, i) => {
    const f = path.join(d, `c${i}.mp4`);
    fs.writeFileSync(f, c);
    inputs.push("-i", f);
    filters.push(`[${i}:v]trim=duration=${seconds},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=24,setsar=1[v${i}]`);
  });
  const chain = clips.map((_, i) => `[v${i}]`).join("") + `concat=n=${clips.length}:v=1:a=0[out]`;
  const out = path.join(d, "final.mp4");
  await run([...inputs, "-filter_complex", filters.join(";") + ";" + chain, "-map", "[out]",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
  const buf = fs.readFileSync(out);
  fs.rmSync(d, { recursive: true, force: true });
  return buf;
}
