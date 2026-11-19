import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

// Cada execução do ffmpeg tem limite de tempo: um processo travado prenderia o job (e uma vaga da fila) para sempre.
const RUN_TIMEOUT = 8 * 60_000;

/**
 * Codificação enxuta para instâncias pequenas (poucos CPUs e 512 MB a 2 GB de RAM):
 * preset veryfast e poucas threads usam uma fração da memória do preset medium, com perda de qualidade pouco visível.
 * O mesmo conjunto vale para todos os clipes, o que permite juntá-los depois sem recodificar.
 */
const ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", "-threads", "2", "-r", "24", "-an"];

function run(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg-static indisponível nesta plataforma"));
    const p = spawn(ffmpegPath, ["-y", "-loglevel", "error", "-nostdin", ...args]);
    let err = "";
    const timer = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("ffmpeg: tempo esgotado")); }, RUN_TIMEOUT);
    p.stderr.on("data", (d) => { err = (err + d).slice(-2000); });
    p.on("error", (e) => { clearTimeout(timer); reject(e); });
    p.on("close", (c, sig) => {
      clearTimeout(timer);
      if (c === 0) resolve();
      else reject(new Error(sig === "SIGKILL" ? "ffmpeg: encerrado pelo sistema (possível falta de memória)" : "ffmpeg: " + err.slice(-400)));
    });
  });
}

/** Pasta temporária apagada sempre, com sucesso ou erro. */
async function withTmp<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "aia-"));
  try { return await fn(d); }
  finally { fs.rmSync(d, { recursive: true, force: true }); }
}

/** Movimentos de câmera do filme animado (todos com aceleração e desaceleração suaves). */
export type Move = "push" | "pull" | "panRight" | "panLeft";

/**
 * Expressões do zoompan para cada movimento. `e` é o progresso suavizado de 0 a 1 (curva smoothstep):
 * a câmera parte devagar, ganha ritmo no meio e desacelera no fim, em vez de andar em velocidade constante.
 */
function moveExpr(move: Move, frames: number) {
  const t = `(on/${Math.max(1, frames - 1)})`;
  const e = `(${t}*${t}*(3-2*${t}))`;
  const cx = "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'";
  switch (move) {
    case "pull": return `z='1.28-0.28*${e}':${cx}`;
    case "panRight": return `z='1.18':x='(iw-iw/zoom)*${e}':y='(ih-ih/zoom)/2'`;
    case "panLeft": return `z='1.18':x='(iw-iw/zoom)*(1-${e})':y='(ih-ih/zoom)/2'`;
    default: return `z='1+0.28*${e}':${cx}`;
  }
}

/** Cena animada 1920x1080 a partir de uma imagem: movimento de câmera suave, sem custo de IA de vídeo. */
export function imageToClip(img: Buffer, seconds: number, move: Move = "push"): Promise<Buffer> {
  return withTmp(async (d) => {
    fs.writeFileSync(path.join(d, "i.png"), img);
    const frames = Math.round(seconds * 24);
    // fade de entrada e saída já na própria cena: a junção final não precisa recodificar nada
    const fade = seconds > 1.2 ? `fade=t=in:st=0:d=0.4,fade=t=out:st=${(seconds - 0.4).toFixed(2)}:d=0.4` : "null";
    // 2880 px de largura bastam para o movimento suave (antes 3840: quase o dobro da memória por quadro)
    await run(["-i", path.join(d, "i.png"), "-vf",
      `scale=2880:-2,zoompan=${moveExpr(move, frames)}:d=${frames}:s=1920x1080:fps=24,${fade},format=yuv420p`,
      "-t", String(seconds), ...ENC, path.join(d, "o.mp4")]);
    return fs.readFileSync(path.join(d, "o.mp4"));
  });
}

/**
 * Junta as cenas (já no mesmo formato: 1920x1080, 24 fps, H.264, sem áudio) em um único MP4, só copiando os pacotes:
 * não recodifica, então leva segundos e quase não usa CPU nem memória, não importa quantas cenas o filme tenha.
 */
export function concatClips(clips: Buffer[]): Promise<Buffer> {
  return withTmp(async (d) => {
    const files = clips.map((c, i) => { const f = path.join(d, `n${i}.mp4`); fs.writeFileSync(f, c); return f; });
    const final = path.join(d, "final.mp4");
    if (files.length === 1) fs.copyFileSync(files[0], final);
    else {
      const list = path.join(d, "list.txt");
      const q = (f: string) => `file '${f.split("\\").join("/").split("'").join("'\\''")}'`;
      fs.writeFileSync(list, files.map(q).join("\n"));
      await run(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", final]);
    }
    return fs.readFileSync(final);
  });
}
