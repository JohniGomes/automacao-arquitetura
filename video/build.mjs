// Gera os dois projetos HyperFrames do vídeo do Croqui (16:9 e 9:16) a partir da mesma linha do tempo.
// Uso: node video/build.mjs   (cria/atualiza video/croqui-promo e video/croqui-promo-9x16)
// O relógio do filme é a narração (assets/voz.mp3): as frases abaixo usam as pausas medidas nela.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_ASSETS = path.join(HERE, "croqui-promo", "assets");
const DUR = 29.6;

// ---- narração: início/fim de cada frase (s), medidos com silencedetect ----
const P = {
  a1: [0.0, 2.17, "Seu modelo 3D já está *pronto.*"],
  a2: [2.51, 4.6, "O render não precisa levar *horas.*"],
  n1: [4.91, 6.07, "Sem hardware", "caro."],
  n2: [6.3, 7.71, "Sem software", "complexo."],
  n3: [8.0, 9.23, "Sem horas", "de espera."],
  c1: [9.69, 10.14, "Croqui"],
  c2: [10.59, 12.47, "A *IA* feita para arquitetura."],
  d4: [12.86, 14.91], d5: [15.31, 17.24], d6: [17.52, 18.64] /* "Da edição por região" (o resto da frase, sobre o filme, foi cortado do áudio) */, d7: [20.49, 21.9],
  e1: [22.27, 23.69, "Menos tempo *renderizando.*"],
  e2: [23.94, 25.27, "Mais tempo *criando.*"],
  e3: [25.62, 26.96, "Teste *grátis* agora."],
};
const CUTS = { s1: 0, s2: 4.7, s3: 9.5, s4: 12.7, s5: 22.2 };
const ENDS = { s1: 4.7, s2: 9.5, s3: 12.7, s4: 22.2, s5: DUR };

const FONT = `@font-face{font-family:"Fraunces";src:url("assets/fonts/fraunces-normal.woff2") format("woff2");font-weight:400;font-style:normal}
@font-face{font-family:"Fraunces";src:url("assets/fonts/fraunces-italic.woff2") format("woff2");font-weight:400;font-style:italic}`;
const GRAD = "linear-gradient(110deg,#FFB48A 0%,#FF86A8 55%,#C4A2FF 100%)";

const ICONS = {
  mapa: ["M12 21s-6.5-5.4-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21z", "M12 12.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z", "#2B2A28"],
  moodboard: ["M4 4.5h7v8H4zM13 4.5h7v4.5h-7z", "M13 11.5h7v8h-7zM4 15h7v4.5H4z", "#8C7A5E"],
  render: ["M3.5 20.5h17M5.5 20.5V9.5L12 4.5l6.5 5v11", "M12 11.5l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9z", "#5A564F"],
  luz: ["M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4", "#B98A4E"],
  editor: ["M4.5 4.5h15v15h-15z", "M8.5 15.5l5-5 2 2-5 5h-2z", "#5A564F"],
  memorial: ["M6.5 3.5h8l3.5 3.5v13.5h-11.5z", "M9.5 11h5.5M9.5 14h5.5M9.5 17h3.5", "#A8432B"],
};
const iconSvg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="#FFFDF9" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[k][0]}"/><path d="${ICONS[k][1]}"/></svg>`;

const logoSvg = (cls, id) => `<svg class="${cls}" id="${id}" viewBox="0 0 48 48" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
<path id="${id}-r" d="M4 26 24 9l20 17" pathLength="100" stroke="#F6F1EA" stroke-dasharray="100 120" stroke-dashoffset="110"/>
<path id="${id}-w" d="M12 22v19h25V22" pathLength="100" stroke="#F6F1EA" stroke-dasharray="100 120" stroke-dashoffset="110"/>
<path id="${id}-g" d="M3 43h42" pathLength="100" stroke="#FF7A59" stroke-dasharray="100 120" stroke-dashoffset="110"/>
<circle id="${id}-d" cx="35" cy="12" r="3" fill="#FF7A59" stroke="none" opacity="0"/></svg>`;

const r3 = (n) => Math.round(n * 1000) / 1000;

/** "Seu modelo *pronto.*" → spans por palavra (as marcadas com * ganham o degradê). */
function wordsHtml(id, text) {
  const out = []; let i = 0;
  for (const part of text.split(/(\*[^*]+\*)/).filter(Boolean)) {
    const g = part.startsWith("*"); const words = (g ? part.slice(1, -1) : part).split(/\s+/).filter(Boolean);
    for (const w of words) out.push(`<span class="w${g ? " g" : ""}${g && /^[A-Z]{1,3}$/.test(w) ? " up" : ""}" id="${id}-${i++}">${w}</span>`);
  }
  return out.join(" ");
}
/** Tweens que revelam cada palavra no instante em que a voz chega nela. */
function revealJs(id, text, t0, t1, sceneStart, y = 46) {
  const n = text.replace(/\*/g, "").split(/\s+/).filter(Boolean);
  const total = n.join("").length; let acc = 0; const lines = [];
  n.forEach((w, i) => {
    const at = r3(t0 - sceneStart - 0.06 + (acc / total) * Math.max(0.2, (t1 - t0) - 0.3)); acc += w.length;
    lines.push(`tl.fromTo("#${id}-${i}",{opacity:0,y:${y},filter:"blur(12px)"},{opacity:1,y:0,filter:"blur(0px)",duration:0.5,ease:"power3.out"},${Math.max(0, at)});`);
  });
  return lines.join("\n");
}
const nWords = (t) => t.replace(/\*/g, "").split(/\s+/).filter(Boolean).length;
const T = (abs, sceneStart) => r3(abs - sceneStart);

function sceneFile(id, W, H, css, body, js) {
  return `<template>
<style>
${FONT}
#root{position:absolute;inset:0;overflow:hidden;font-family:"Inter",sans-serif;color:#F6F1EA}
#root *{box-sizing:border-box;margin:0;padding:0}
.w{display:inline-block;margin-right:.24em;will-change:transform,opacity}
.w.g,.g{background:${GRAD};-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;font-style:italic;padding-right:.06em}
.w.up{font-style:normal;font-weight:400}
.disp{font-family:"Fraunces",Georgia,serif;font-weight:400;letter-spacing:-0.02em;line-height:1.08}
${css}
</style>
<div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}">
${body}
</div>
<script>
const tl = gsap.timeline({ paused: true });
${js}
window.__timelines["${id}"] = tl;
</script>
</template>
`;
}

function build(V) {
  const W = V ? 1080 : 1920, H = V ? 1920 : 1080;
  const dir = path.join(HERE, V ? "croqui-promo-9x16" : "croqui-promo");
  const comp = path.join(dir, "compositions");
  fs.mkdirSync(comp, { recursive: true });
  if (V) { fs.cpSync(SRC_ASSETS, path.join(dir, "assets"), { recursive: true }); }
  const files = {};

  // ======================= fundo: aurora =======================
  {
    const sz = V ? [900, 900, 800, 700] : [1100, 1200, 900, 800];
    const css = `.bl{position:absolute;border-radius:50%;filter:blur(${V ? 130 : 150}px);will-change:transform,opacity}
#bg-base{position:absolute;inset:0;background:#0C0A0E}
#bg-b1{width:${sz[0]}px;height:${sz[0]}px;left:${V ? -380 : -300}px;top:${V ? 60 : -260}px;background:#D2482B;opacity:.6}
#bg-b2{width:${sz[1]}px;height:${sz[1]}px;left:${V ? 300 : 1000}px;top:${V ? 700 : -300}px;background:#6A3FD6;opacity:.6}
#bg-b3{width:${sz[2]}px;height:${sz[2]}px;left:${V ? 60 : 560}px;top:${V ? 1150 : 600}px;background:#E0467A;opacity:.38}
#bg-b4{width:${sz[3]}px;height:${sz[3]}px;left:${V ? 420 : 1250}px;top:${V ? 120 : 650}px;background:#E8A04A;opacity:.28}
#bg-grid{position:absolute;inset:0;opacity:.5;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:80px 80px;-webkit-mask-image:linear-gradient(#000 25%,transparent 90%);mask-image:linear-gradient(#000 25%,transparent 90%)}
#bg-vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,transparent 55%,rgba(0,0,0,.55) 100%)}`;
    const body = `<div id="bg-base"></div><div class="bl" id="bg-b1"></div><div class="bl" id="bg-b2"></div><div class="bl" id="bg-b3"></div><div class="bl" id="bg-b4"></div><div id="bg-grid"></div><div id="bg-vig"></div>`;
    const dx = V ? 90 : 160, dy = V ? 120 : 90;
    const js = `tl.to("#bg-b1",{x:${dx},y:${dy},duration:${DUR},ease:"none"},0);
tl.to("#bg-b2",{x:-${dx},y:-${dy},duration:${DUR},ease:"none"},0);
tl.to("#bg-b3",{x:${dx},y:-${dy},duration:${DUR},ease:"none"},0);
tl.to("#bg-b4",{x:-${dx},y:${dy},duration:${DUR},ease:"none"},0);
/* o clima acompanha a história: escurece nos "sem", abre na marca, esquenta no final */
tl.to("#bg-b1,#bg-b2",{opacity:.34,duration:0.6,ease:"power2.inOut"},4.7);
tl.to("#bg-b1,#bg-b2",{opacity:.62,duration:0.7,ease:"power2.out"},9.6);
tl.to("#bg-b1,#bg-b2",{opacity:.5,duration:1.0,ease:"power2.inOut"},12.7);
tl.to("#bg-b1",{opacity:.8,duration:1.2,ease:"power2.inOut"},22.2);`;
    files["bg"] = sceneFile("bg", W, H, css, body, js);
  }

  // ======================= S1: gancho =======================
  {
    const s0 = CUTS.s1;
    const fw = V ? 1000 : 1240, fh = Math.round(fw * 893 / 1600);
    const fx = Math.round((W - fw) / 2), fy = V ? 220 : 52;
    const tTop = V ? 860 : fy + fh + 44, fs = V ? 100 : 100;
    const css = `#s1-frame{position:absolute;left:${fx}px;top:${fy}px;width:${fw}px;height:${fh}px;border-radius:28px;overflow:hidden;background:#fff;box-shadow:0 40px 120px -30px rgba(0,0,0,.9),0 0 0 1px rgba(255,255,255,.18),0 0 110px -10px rgba(240,100,70,.45)}
#s1-frame img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover}
#s1-r{clip-path:inset(0 100% 0 0)}
#s1-edge{position:absolute;top:0;height:100%;width:8px;left:0;background:linear-gradient(180deg,#FF9A6B,#F0627F,#B084FF);box-shadow:0 0 40px 8px rgba(255,140,110,.7);opacity:0}
.s1-tag{position:absolute;left:22px;bottom:20px;padding:8px 18px;border-radius:99px;background:rgba(20,16,22,.72);border:1px solid rgba(255,255,255,.22);font-weight:700;font-size:30px;letter-spacing:.12em}
#s1-t2{opacity:0}
.s1-p{position:absolute;left:${V ? 60 : 0}px;width:${V ? 960 : W}px;top:${tTop}px;text-align:${V ? "left" : "center"};font-size:${fs}px}`;
    const body = `<div id="s1-frame"><img id="s1-m" src="assets/img/modelo.jpg" alt=""><img id="s1-r" src="assets/img/render.jpg" alt=""><div id="s1-edge"></div><div class="s1-tag" id="s1-t1">MODELO 3D</div><div class="s1-tag" id="s1-t2">RENDER</div></div>
<div class="s1-p disp" id="s1-p1">${wordsHtml("s1a", P.a1[2])}</div>
<div class="s1-p disp" id="s1-p2">${wordsHtml("s1b", P.a2[2])}</div>`;
    const wipeStart = T(2.7, s0);
    const js = `tl.fromTo("#s1-frame",{scale:0.95,opacity:1,y:24},{scale:1,y:0,duration:0.9,ease:"power3.out"},0);
${revealJs("s1a", P.a1[2], P.a1[0], P.a1[1], s0, 40)}
tl.to("#s1-p1",{opacity:0,y:-30,filter:"blur(8px)",duration:0.3,ease:"power2.in"},${T(2.42, s0)});
tl.fromTo("#s1-p2",{opacity:1},{opacity:1,duration:0.01},0);
${revealJs("s1b", P.a2[2], P.a2[0], P.a2[1], s0, 40)}
tl.fromTo("#s1-edge",{x:0,opacity:0},{x:${fw - 8},opacity:1,duration:0.8,ease:"power2.inOut"},${wipeStart});
tl.to("#s1-edge",{opacity:0,duration:0.2},${r3(wipeStart + 0.8)});
tl.fromTo("#s1-r",{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0)",duration:0.8,ease:"power2.inOut"},${wipeStart});
tl.to("#s1-t1",{opacity:0,duration:0.2},${wipeStart});
tl.fromTo("#s1-t2",{opacity:0},{opacity:1,duration:0.3},${r3(wipeStart + 0.6)});
tl.to("#s1-frame",{scale:1.03,duration:${r3(ENDS.s1 - CUTS.s1 - 1)},ease:"none"},1.0);`;
    files["s1"] = sceneFile("s1", W, H, css, body, js).replace('tl.fromTo("#s1-p2",{opacity:1},{opacity:1,duration:0.01},0);', "");
  }

  // ======================= S2: os três "sem" =======================
  {
    const s0 = CUTS.s2; const fs = V ? 128 : 138;
    const tops = V ? [250, 560, 870] : [250, 470, 690];
    const css = `.s2-p{position:absolute;left:0;width:${W}px;text-align:center;font-size:${fs}px}
.s2-p .neg{position:relative;display:${V ? "block" : "inline-block"};${V ? "width:fit-content;margin:0 auto;" : "margin-right:0;"}}
.s2-p .bar{position:absolute;left:-1%;top:56%;height:.085em;width:102%;border-radius:99px;background:${GRAD};transform-origin:0 50%;box-shadow:0 0 30px rgba(240,98,127,.7)}
.s2-p .neg .w{margin-right:0}
.s2-p .pre{display:${V ? "block" : "inline"}}
${tops.map((t, i) => `#s2-p${i + 1}{top:${t}px}`).join("\n")}`;
    const ph = [P.n1, P.n2, P.n3];
    const body = ph.map((p, i) => `<div class="s2-p disp" id="s2-p${i + 1}"><span class="pre">${wordsHtml(`s2p${i + 1}`, p[2])}</span> <span class="neg"><span class="w" id="s2n${i + 1}">${p[3]}</span><i class="bar" id="s2bar${i + 1}"></i></span></div>`).join("\n");
    const js = ph.map((p, i) => {
      const n = i + 1; const start = T(p[0], s0) - 0.04; const nW = nWords(p[2]);
      const chars = p[2].replace(/\*/g, "").split(/\s+/).filter(Boolean);
      const pre = chars.map((w, k) => `tl.fromTo("#s2p${n}-${k}",{opacity:0,y:60,filter:"blur(14px)"},{opacity:1,y:0,filter:"blur(0px)",duration:0.5,ease:"power3.out"},${r3(start + k * 0.12)});`).join("\n");
      const negAt = r3(start + nW * 0.12 + 0.12);
      const strikeAt = T(p[1], s0) - 0.38;
      return `${pre}
tl.fromTo("#s2n${n}",{opacity:0,y:60,filter:"blur(14px)"},{opacity:1,y:0,filter:"blur(0px)",duration:0.5,ease:"power3.out"},${negAt});
tl.fromTo("#s2bar${n}",{scaleX:0},{scaleX:1,duration:0.28,ease:"power4.out"},${r3(strikeAt)});
tl.to("#s2n${n}",{color:"rgba(246,241,234,.42)",duration:0.25},${r3(strikeAt)});`;
    }).join("\n");
    files["s2"] = sceneFile("s2", W, H, css, body, js);
  }

  // ======================= S3: a marca =======================
  {
    const s0 = CUTS.s3; const L = V ? { logo: 250, word: 210, tag: 92, lt: 330, wt: 640, tgt: 930 } : { logo: 210, word: 230, tag: 82, lt: 250, wt: 250, tgt: 590 };
    const css = V
      ? `#s3-logo{position:absolute;left:${(W - L.logo) / 2}px;top:${L.lt}px;width:${L.logo}px;height:${L.logo}px}
#s3-word{position:absolute;left:0;width:${W}px;top:${L.wt}px;text-align:center;font-size:${L.word}px;line-height:1}
#s3-tag{position:absolute;left:60px;width:960px;top:${L.tgt}px;text-align:center;font-size:${L.tag}px}`
      : `#s3-lock{position:absolute;left:0;width:${W}px;top:${L.lt}px;display:flex;justify-content:center;align-items:center;gap:36px}
#s3-logo{width:${L.logo}px;height:${L.logo}px}
#s3-word{font-size:${L.word}px;line-height:1}
#s3-tag{position:absolute;left:0;width:${W}px;top:${L.tgt}px;text-align:center;font-size:${L.tag}px}`;
    const body = V
      ? `${logoSvg("", "s3-logo")}<div class="disp" id="s3-word">Croqui</div><div class="disp" id="s3-tag">${wordsHtml("s3t", P.c2[2])}</div>`
      : `<div id="s3-lock">${logoSvg("", "s3-logo")}<div class="disp" id="s3-word">Croqui</div></div><div class="disp" id="s3-tag">${wordsHtml("s3t", P.c2[2])}</div>`;
    const a = T(P.c1[0], s0);
    const js = `tl.fromTo("#s3-logo-r",{strokeDashoffset:110},{strokeDashoffset:0,duration:0.5,ease:"power2.inOut"},${a});
tl.fromTo("#s3-logo-w",{strokeDashoffset:110},{strokeDashoffset:0,duration:0.5,ease:"power2.inOut"},${r3(a + 0.12)});
tl.fromTo("#s3-logo-g",{strokeDashoffset:110},{strokeDashoffset:0,duration:0.4,ease:"power2.inOut"},${r3(a + 0.3)});
tl.fromTo("#s3-logo-d",{opacity:0,scale:0},{opacity:1,scale:1,transformOrigin:"50% 50%",duration:0.3,ease:"back.out(3)"},${r3(a + 0.5)});
tl.fromTo("#s3-word",{opacity:0,y:40,filter:"blur(14px)"},{opacity:1,y:0,filter:"blur(0px)",duration:0.7,ease:"power3.out"},${r3(a + 0.1)});
${revealJs("s3t", P.c2[2], P.c2[0] === P.c2[0] ? P.c2[0] : 0, P.c2[1], s0, 40)}
tl.to("#s3-logo",{scale:1.06,transformOrigin:"50% 50%",duration:2.4,ease:"none"},${r3(a + 0.9)});`;
    files["s3"] = sceneFile("s3", W, H, css, body, js);
  }

  // ======================= S4: o produto =======================
  {
    const s0 = CUTS.s4;
    // janela: 16:9 mostra a tela inteira; 9:16 recorta a área de trabalho (cartão + painel)
    const win = V ? { w: 1000, h: 942, x: 40, y: 300 } : { w: 1560, h: 877, x: 180, y: 140 };
    const k = V ? 1000 / 1700 : 1560 / 1800;
    const imgW = Math.round(2880 * k), imgL = -Math.round((V ? 650 : 600) * k), imgT = -Math.round(30 * k);
    const chipX = win.x, chipY = V ? 180 : 40;
    // plano de cortes (s absolutos): tela, chip, foco da câmera (0-1)
    const shots = [
      { id: "mapa", img: "mapa", name: "Mapa de situação", icon: "mapa", a: 12.7, b: 14.1, f: [0.55, 0.3], hv: 560, fv: [0.7, 0.3] },
      { id: "mood", img: "moodboard", name: "Moodboard", icon: "moodboard", a: 14.1, b: 15.1, f: [0.55, 0.3], hv: 940, fv: [0.66, 0.25] },
      { id: "rend", img: "render_loaded", name: "Render", icon: "render", a: 15.1, b: 16.0, f: [0.55, 0.3], hv: 940, fv: [0.5, 0.3] },
      { id: "luz", img: "luz_loaded", name: "Variação de luz", icon: "luz", a: 16.0, b: 17.45, f: [0.55, 0.3], hv: 600, fv: [0.66, 0.25] },
      { id: "edit", img: "editor_loaded", name: "Editar por regiões", icon: "editor", a: 17.45, b: 18.9, f: [0.55, 0.3], hv: 760, fv: [0.5, 0.45] },
      { id: "memo", img: "memorial", name: "Memorial descritivo", icon: "memorial", a: 18.9, b: 20.3, f: [0.55, 0.3], hv: 940, fv: [0.62, 0.3] },
      { id: "home", img: "app", name: "Tudo em um só lugar", icon: null, a: 20.3, b: 22.2, f: [0.55, 0.3], hv: 940, fv: [0.5, 0.22] },
    ];
    const css = `.s4-win{position:absolute;left:${win.x}px;top:${win.y}px;width:${win.w}px;height:${win.h}px;border-radius:26px;overflow:hidden;background:#F4EFE8;box-shadow:0 50px 140px -30px rgba(0,0,0,.9),0 0 0 1px rgba(255,255,255,.2),0 0 120px -20px rgba(176,132,255,.4);opacity:0}
.s4-in{position:absolute;inset:0;overflow:hidden}
.s4-in img{position:absolute;left:${imgL}px;top:${imgT}px;width:${imgW}px;height:auto;max-width:none}
.s4-in video{position:absolute;left:0;top:0;width:${win.w}px;height:${V ? Math.round(win.w * 9 / 16) : win.h}px;object-fit:cover}
.s4-vid{background:#0C0A0E}
.s4-chip{position:absolute;left:${chipX}px;top:${chipY}px;height:${V ? 92 : 80}px;padding:0 ${V ? 34 : 30}px 0 14px;display:flex;align-items:center;gap:${V ? 20 : 18}px;border-radius:99px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);font-weight:700;font-size:${V ? 42 : 38}px;opacity:0;white-space:nowrap}
.s4-chip .ti{width:${V ? 64 : 56}px;height:${V ? 64 : 56}px;border-radius:16px;display:grid;place-items:center;box-shadow:0 8px 24px -6px rgba(255,122,89,.7);flex:none}
.s4-chip .ti svg{width:58%;height:58%}
.s4-chip .lg{width:${V ? 64 : 56}px;height:${V ? 64 : 56}px;flex:none}`;
    const homeLogo = `<svg class="lg" viewBox="0 0 48 48" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 26 24 9l20 17M12 22v19h25V22" stroke="#F6F1EA"/><path d="M3 43h42" stroke="#FF7A59"/><circle cx="35" cy="12" r="3" fill="#FF7A59" stroke="none"/></svg>`;
    const body = shots.map((s) => {
      const inner = `<div class="s4-in" id="s4-${s.id}-in"><img src="assets/shots/${s.img}.png" alt=""></div>`;
      const vidWin = s.video && V ? "" : "";
      return `<div class="s4-win" id="s4-${s.id}"${V ? ` style="height:${s.hv}px"` : ""}>${inner}</div><div class="s4-chip" id="s4-${s.id}-c">${s.icon ? `<span class="ti" style="background:${ICONS[s.icon][2]}">${iconSvg(s.icon)}</span>` : homeLogo}<span>${s.name}</span></div>`;
    }).join("\n");
    const zs = V ? 1.22 : 1.17;
    const js = shots.map((s, i) => {
      const a = T(s.a, s0), b = T(s.b, s0), last = i === shots.length - 1;
      const dir = i % 2 ? -1 : 1; const off = V ? 160 : 260;
      return `/* ${s.id} */
tl.fromTo("#s4-${s.id}",{opacity:0,x:${dir * off},scale:0.96},{opacity:1,x:0,scale:1,duration:0.45,ease:"power3.out"},${r3(a - 0.1)});
tl.fromTo("#s4-${s.id}-c",{opacity:0,y:-22},{opacity:1,y:0,duration:0.4,ease:"power3.out"},${r3(a + 0.1)});
tl.fromTo("#s4-${s.id}-in",{scale:1,transformOrigin:"${(V ? s.fv : s.f)[0] * 100}% ${(V ? s.fv : s.f)[1] * 100}%"},{scale:${zs},duration:${r3(b - a + 0.2)},ease:"power2.inOut"},${r3(a + 0.05)});
${last ? "" : `tl.to("#s4-${s.id}",{opacity:0,x:${-dir * (V ? 120 : 200)},duration:0.3,ease:"power2.in"},${r3(b - 0.05)});
tl.to("#s4-${s.id}-c",{opacity:0,duration:0.2},${r3(b + 0.05)});`}`;
    }).join("\n");
    files["s4"] = sceneFile("s4", W, H, css, body, js);
  }

  // ======================= S5: fechamento =======================
  {
    const s0 = CUTS.s5; const fs = V ? 112 : 128;
    const L = V ? { q1: 380, q2: 730, lock: 330, line: 640, btn: 900, bw: 760, bh: 140, bf: 54, lw: 170, wf: 150 } : { q1: 300, q2: 480, lock: 230, line: 500, btn: 730, bw: 600, bh: 124, bf: 50, lw: 150, wf: 150 };
    const css = `#s5-img{position:absolute;inset:0;overflow:hidden}
#s5-img img{position:absolute;left:50%;top:0;height:100%;width:auto;min-width:100%;margin-left:${V ? -1070 : -960}px;max-width:none}
#s5-scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(12,10,14,.82),rgba(12,10,14,.72) 50%,rgba(12,10,14,.88))}
.s5-q{position:absolute;left:${V ? 60 : 0}px;width:${V ? 960 : W}px;text-align:${V ? "left" : "center"};font-size:${fs}px}
#s5-q1{top:${L.q1}px}#s5-q2{top:${L.q2}px}
#s5-cta{position:absolute;inset:0}
#s5-lock{position:absolute;left:0;width:${W}px;top:${L.lock}px;display:flex;justify-content:center;align-items:center;gap:26px}
#s5-lock svg{width:${L.lw}px;height:${L.lw}px}
#s5-lock .disp{font-size:${L.wf}px;line-height:1}
#s5-line{position:absolute;left:0;width:${W}px;top:${L.line}px;text-align:center;font-size:${V ? 104 : 92}px}
#s5-btn{position:absolute;left:${(W - L.bw) / 2}px;top:${L.btn}px;width:${L.bw}px;height:${L.bh}px;border-radius:99px;background:linear-gradient(135deg,#E2573A,#F2894F);display:grid;place-items:center;font-weight:700;font-size:${L.bf}px;color:#fff;box-shadow:0 20px 70px -12px rgba(240,100,60,.85),inset 0 2px 0 rgba(255,255,255,.35);opacity:0}`;
    const body = `<div id="s5-img"><img src="assets/img/render.jpg" alt=""></div><div id="s5-scrim"></div>
<div class="s5-q disp" id="s5-q1">${wordsHtml("s5a", P.e1[2])}</div>
<div class="s5-q disp" id="s5-q2">${wordsHtml("s5b", P.e2[2])}</div>
<div id="s5-cta"><div id="s5-lock">${logoSvg("", "s5-logo")}<div class="disp" id="s5-wm">Croqui</div></div>
<div class="disp" id="s5-line">${wordsHtml("s5c", P.e3[2])}</div><div id="s5-btn">Criar conta grátis</div></div>`;
    const ctaAt = T(25.27, s0);
    const js = `tl.fromTo("#s5-img img",{scale:1.0,transformOrigin:"50% 50%"},{scale:1.12,duration:${r3(DUR - s0)},ease:"none"},0);
${revealJs("s5a", P.e1[2], P.e1[0], P.e1[1], s0, 50)}
${revealJs("s5b", P.e2[2], P.e2[0], P.e2[1], s0, 50)}
tl.to("#s5-q1,#s5-q2",{opacity:0,y:-36,filter:"blur(10px)",duration:0.35,ease:"power2.in"},${ctaAt});
/* chamada final: a marca é desenhada, depois o botão sobe */
tl.fromTo("#s5-logo-r",{strokeDashoffset:110},{strokeDashoffset:0,duration:0.45,ease:"power2.inOut"},${r3(ctaAt + 0.15)});
tl.fromTo("#s5-logo-w",{strokeDashoffset:110},{strokeDashoffset:0,duration:0.45,ease:"power2.inOut"},${r3(ctaAt + 0.25)});
tl.fromTo("#s5-logo-g",{strokeDashoffset:110},{strokeDashoffset:0,duration:0.35,ease:"power2.inOut"},${r3(ctaAt + 0.4)});
tl.fromTo("#s5-logo-d",{opacity:0,scale:0},{opacity:1,scale:1,transformOrigin:"50% 50%",duration:0.3,ease:"back.out(3)"},${r3(ctaAt + 0.6)});
tl.fromTo("#s5-wm",{opacity:0,x:-30,filter:"blur(10px)"},{opacity:1,x:0,filter:"blur(0px)",duration:0.6,ease:"power3.out"},${r3(ctaAt + 0.3)});
${revealJs("s5c", P.e3[2], P.e3[0], P.e3[1], s0, 40)}
tl.fromTo("#s5-btn",{opacity:0,y:60,scale:0.9},{opacity:1,y:0,scale:1,duration:0.6,ease:"back.out(1.6)"},${T(26.1, s0)});
tl.to("#s5-btn",{boxShadow:"0 20px 110px -6px rgba(255,120,80,1),inset 0 2px 0 rgba(255,255,255,.35)",duration:0.9,ease:"sine.inOut",yoyo:true,repeat:1},${T(26.9, s0)});`;
    files["s5"] = sceneFile("s5", W, H, css, body, js);
  }

  for (const [k, v] of Object.entries(files)) fs.writeFileSync(path.join(comp, `${k}.html`), v);

  // ======================= som =======================
  const sfx = [
    // [id, arquivo, início (s), volume, taxa, duração, mídia-início]
    ["sfx-wipe", "whoosh-short", 2.62, 0.6, 1.0],
    ["sfx-cut1", "whoosh", 4.52, 0.6, 1.0],
    ["sfx-pop1", "pop", 5.72, 0.55, 1.0],
    ["sfx-pop2", "pop", 7.38, 0.55, 0.88],
    ["sfx-pop3", "pop", 8.9, 0.55, 1.12],
    ["sfx-logo", "sparkle", 9.6, 0.5, 1.0],
    ["sfx-cut3", "whoosh-short", 12.55, 0.6, 1.0],
    ["sfx-in1", "whoosh-short", 14.0, 0.3, 1.25],
    ["sfx-in2", "whoosh", 15.0, 0.5, 1.1],
    ["sfx-in3", "whoosh-short", 15.9, 0.3, 0.9],
    ["sfx-in4", "whoosh", 17.35, 0.5, 0.95],
    ["sfx-in5", "whoosh-short", 18.8, 0.3, 1.2],
    ["sfx-in6", "whoosh", 20.2, 0.5, 1.05],
    ["sfx-cut5", "whoosh-short", 22.1, 0.6, 0.9],
  ];
  const audio = [`<audio id="voz" class="clip" data-start="0" data-duration="27.2" data-track-index="10" data-volume="1" src="assets/voz.mp3"></audio>`]
    .concat(sfx.map(([id, f, t, v, r], i) => `<audio id="${id}" class="clip" data-start="${t}" data-duration="${r3(Math.min(f === "sparkle" ? 1.8 : 0.57, 1.8) / r)}" data-track-index="${11 + i}" data-volume="${v}" data-playback-rate="${r}" src="assets/${f}.mp3"></audio>`))
    .concat([
      `<audio id="sfx-riser" class="clip" data-start="24.42" data-duration="1.2" data-media-start="2.4" data-fade-in="0.9" data-track-index="30" data-volume="0.6" src="assets/riser.mp3"></audio>`,
      `<audio id="sfx-impact" class="clip" data-start="25.62" data-duration="1.8" data-track-index="31" data-volume="0.8" src="assets/impact-bass-1.mp3"></audio>`,
    ]);

  const hosts = [["bg", 0, DUR, 1]].concat(["s1", "s2", "s3", "s4", "s5"].map((s, i) => [s, CUTS[s], r3(ENDS[s] - CUTS[s]), i + 2]));
  const index = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${W}, height=${H}" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#0C0A0E}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="${W}" data-height="${H}">
${hosts.map(([id, st, du, tr]) => `<div id="${id}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${st}" data-duration="${du}" data-track-index="${tr}" data-width="${W}" data-height="${H}" data-track-kind="graphics"></div>`).join("\n")}
${audio.join("\n")}
</div>
<script>
window.__timelines = window.__timelines || {};
window.__timelines["main"] = gsap.timeline({ paused: true });
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(dir, "index.html"), index);
  console.log("ok", dir);
}

build(false);
build(true);
