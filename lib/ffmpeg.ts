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
    // 2880 px de largura bastam para o movimento suave (antes 3840: quase o dobro da memória por quadro)
    await run(["-i", path.join(d, "i.png"), "-vf",
      `scale=2880:-2,zoompan=${moveExpr(move, frames)}:d=${frames}:s=1920x1080:fps=24,format=yuv420p`,
      "-t", String(seconds), ...ENC, path.join(d, "o.mp4")]);
    return fs.readFileSync(path.join(d, "o.mp4"));
  });
}

/**
 * Junta clipes (cortados a `seconds` só se > 0; senão inteiros) em um único MP4 1920x1080, 24 fps, sem áudio.
 * Cada clipe é normalizado sozinho (um decodificador por vez) e a junção final só copia os pacotes, sem recodificar:
 * a memória fica quase constante, não importa quantas cenas o filme tenha. `onStep(feitos, total)` avisa o andamento.
 */
export function concatClips(clips: Buffer[], seconds: number, onStep?: (done: number, total: number) => void): Promise<Buffer> {
  return withTmp(async (d) => {
    const norm: string[] = [];
    for (let i = 0; i < clips.length; i++) {
      const src = path.join(d, `c${i}.mp4`);
      const out = path.join(d, `n${i}.mp4`);
      fs.writeFileSync(src, clips[i]);
      const fade = seconds > 1.2 ? `fade=t=in:st=0:d=0.4,fade=t=out:st=${(seconds - 0.4).toFixed(2)}:d=0.4,` : "";
      const vf = `${seconds > 0 ? `trim=duration=${seconds},` : ""}setpts=PTS-STARTPTS,${fade}scale=1920:1080:flags=bicubic:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=24,setsar=1,format=yuv420p`;
      await run(["-i", src, "-vf", vf, ...ENC, "-movflags", "+faststart", out]);
      fs.rmSync(src, { force: true });
      norm.push(out);
      onStep?.(i + 1, clips.length);
    }
    const final = path.join(d, "final.mp4");
    if (norm.length === 1) fs.copyFileSync(norm[0], final);
    else {
      const list = path.join(d, "list.txt");
      fs.writeFileSync(list, norm.map((f) => `file '${f.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n"));
      await run(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", final]);
    }
    return fs.readFileSync(final);
  });
}
