/**
 * Montagem dos prompts das ferramentas de imagem a partir das opções da tela.
 * Funções puras (rodam no navegador para mostrar o prompt e no servidor para gerar).
 */

export type Env = "exterior" | "interior";
export const AMBIENTE_ENV: Record<Env, string> = { exterior: "Exterior", interior: "Interior" };

// ------------------------------------------------------------------ render
export const ESTILOS = {
  realista: { label: "Realista", desc: "Fotorrealista, com luz natural.", text: "Photorealistic result with natural lighting and physically plausible materials." },
  preciso: { label: "Preciso", desc: "Máxima fidelidade ao modelo.", text: "Maximum fidelity to the supplied image: keep every element, material boundary and proportion exactly where they are, and only add realistic surface detail and lighting." },
  criativo: { label: "Criativo", desc: "Mais liberdade em materiais e atmosfera.", text: "Allow tasteful creative interpretation of materials, vegetation and atmosphere while keeping the building geometry and camera unchanged." },
} as const;
export type EstiloKey = keyof typeof ESTILOS;

export const NIVEIS = [
  { label: "Leve", text: "Apply a light enhancement, staying very close to the input." },
  { label: "Médio", text: "Apply a balanced level of detail and realism." },
  { label: "Ultra", text: "Apply an ultra-detailed, premium-quality result with rich textures, depth and cinematic realism." },
] as const;

export const AMBIENTES_TEXT: Record<Env, string> = {
  exterior: "Exterior view: realistic facade materials such as exposed architectural concrete, natural wood and glass with realistic reflections, tropical Brazilian landscaping, and a realistic sky and surroundings.",
  interior: "Interior view: realistic furniture, finishes and materials, balanced natural and artificial light, coherent decoration, and no change to the room layout.",
};

/** Cenas de luz e clima. `swatch` é só a prévia colorida na tela. */
export const CENAS_LUZ = [
  { id: "meiodia", label: "Meio-dia", text: "midday: bright overhead sun, short crisp shadows, clear sky", swatch: "linear-gradient(160deg,#f6e7a8,#9fc7d9)" },
  { id: "manha", label: "Manhã", text: "morning: soft diffused light, short shadows, fresh clear sky", swatch: "linear-gradient(160deg,#fbe9d0,#b9d6dd)" },
  { id: "poente", label: "Pôr do sol", text: "sunset: low warm sun, long soft shadows, golden glow on the facade", swatch: "linear-gradient(160deg,#f2b57a,#8d5b78)" },
  { id: "blue", label: "Blue hour", text: "blue hour: deep blue sky with the interior lights switched on and glowing windows", swatch: "linear-gradient(160deg,#4a6fa5,#1f2f55)" },
  { id: "noite", label: "Noite", text: "night: soft architectural lighting, dark sky, illuminated windows and garden lights", swatch: "linear-gradient(160deg,#2c3550,#0e1424)" },
  { id: "nublado", label: "Nublado", text: "overcast: soft even diffused light under a cloudy sky", swatch: "linear-gradient(160deg,#cfd6d8,#98a4a8)" },
  { id: "chuva", label: "Chuva", text: "rainy day: wet surfaces, soft grey light and subtle reflections", swatch: "linear-gradient(160deg,#9aa9b2,#5d6e78)" },
] as const;
export type CenaLuzId = (typeof CENAS_LUZ)[number]["id"];

export const ELEMENTOS = [
  { id: "pessoas", label: "Pessoas", text: "a few people naturally placed and correctly scaled" },
  { id: "carros", label: "Carros", text: "parked cars appropriate to the scene" },
  { id: "vegetacao", label: "Vegetação", text: "lush vegetation and trees" },
  { id: "plantas", label: "Plantas e vasos", text: "potted plants and indoor greenery" },
  { id: "decoracao", label: "Decoração", text: "tasteful decorative objects, books and accessories" },
  { id: "ceu", label: "Nuvens no céu", text: "a sky with soft clouds" },
] as const;
export type ElementoId = (typeof ELEMENTOS)[number]["id"];

const INTRO_RENDER = "Transform the supplied architectural model screenshot into a photorealistic architectural visualization. Preserve the original building geometry, rooflines, window positions, proportions, camera angle and composition.";
const CLOSING = "Physically plausible materials, realistic global illumination, natural shadows, professional architectural photography, high detail, no structural modifications.";

export type RenderOpts = { style: EstiloKey; level: number; env: Env; guidance: string; scene: string; elements: string[]; sceneFree?: string; reference: boolean };

export function composeRender(o: RenderOpts): string {
  const scene = CENAS_LUZ.find((s) => s.id === o.scene);
  const light = o.sceneFree?.trim() ? `Lighting and atmosphere: ${o.sceneFree.trim()}.`
    : scene ? `Lighting and atmosphere: ${scene.text}.`
    : o.env === "exterior" ? "Soft late-afternoon sunlight." : "Balanced natural daylight.";
  const els = ELEMENTOS.filter((e) => o.elements.includes(e.id)).map((e) => e.text);
  return [
    INTRO_RENDER,
    AMBIENTES_TEXT[o.env],
    light,
    els.length ? `Add ${els.join("; ")}.` : "",
    o.reference ? "Use the second attached image only as a reference for lighting, atmosphere and mood; do not copy its content or layout." : "",
    ESTILOS[o.style].text,
    NIVEIS[Math.min(2, Math.max(0, o.level))].text,
    o.guidance.trim() ? `Additional guidance: ${o.guidance.trim()}` : "",
    CLOSING,
  ].filter(Boolean).join(" ");
}

// --------------------------------------------------------- melhorar render
export const MELHORIAS = {
  refinamento: { label: "Refinamento", desc: "Mais elegância e equilíbrio visual.", text: "Refine the render: more elegance, cleaner details and better visual balance." },
  fidelidade: { label: "Fidelidade", desc: "Melhora a qualidade mantendo o original.", text: "Improve image quality while keeping maximum fidelity to the original render." },
  realismo: { label: "Realismo", desc: "Aproxima a imagem de uma fotografia.", text: "Make the image closer to a real photograph: realistic materials, natural depth of field and subtle natural imperfections." },
  premium: { label: "Premium", desc: "Visual sofisticado para o projeto.", text: "Elevate the project with a sophisticated premium look: refined materials, styling and atmosphere." },
  iluminacao: { label: "Iluminação", desc: "Ajusta a luz para a cena ficar equilibrada.", text: "Adjust the lighting so the scene looks beautiful and balanced: better exposure, soft shadows and balanced highlights." },
} as const;
export type MelhoriaKey = keyof typeof MELHORIAS;

export function composeMelhorar(o: { preset: MelhoriaKey; creativity: number; guidance: string }): string {
  const c = o.creativity;
  const liberdade = c < 34 ? "Stay extremely faithful to the original: do not add or remove any element."
    : c < 67 ? "Allow small refinements to details while keeping the design unchanged."
    : "Allow bolder improvements to materials, styling and atmosphere, still preserving the design and the camera.";
  return [
    "Improve the supplied architectural render.",
    MELHORIAS[o.preset].text,
    "Keep the building geometry, camera angle and composition.",
    liberdade,
    o.guidance.trim() ? `Additional guidance: ${o.guidance.trim()}` : "",
    "Output professional architectural photography quality, high resolution and high detail.",
  ].filter(Boolean).join(" ");
}

// ------------------------------------------------------------------ esboço
export const ESTILOS_ARQ = ["Moderno", "Contemporâneo", "Minimalista", "Rústico", "Clássico", "Industrial", "Tropical", "Escandinavo"] as const;

export function composeEsboco(o: { env: Env; estilo: string; detalhes: string }): string {
  return [
    "Transform the supplied hand-drawn sketch or line drawing into a photorealistic architectural visualization.",
    "Keep the composition, perspective and proportions exactly as drawn.",
    AMBIENTES_TEXT[o.env],
    ESTILOS_ARQ.includes(o.estilo as never) ? `Architectural style: ${o.estilo}.` : "",
    o.detalhes.trim() ? `Details: ${o.detalhes.trim()}` : "",
    CLOSING,
  ].filter(Boolean).join(" ");
}

// ------------------------------------------------------------------ ideias
export const TIPOS_IDEIA: Record<Env, string[]> = {
  exterior: ["Fachada", "Paisagismo", "Área externa e piscina"],
  interior: ["Sala", "Cozinha", "Quarto", "Banheiro", "Home office"],
};

export function composeIdeia(o: { env: Env; tipo: string; estilo: string; detalhes: string; reference: boolean }): string {
  return [
    `Using the first supplied image as the base, generate a new design variation of the ${o.tipo.toLowerCase()} in a ${o.estilo.toLowerCase()} style.`,
    "Keep the camera angle, overall volumes and proportions; change materials, finishes, colors, furniture or landscaping to express the style.",
    o.reference ? "Use the second attached image only as inspiration for mood and materials." : "",
    o.detalhes.trim() ? `Details: ${o.detalhes.trim()}` : "",
    "Photorealistic architectural photography, natural lighting, high detail.",
  ].filter(Boolean).join(" ");
}

// ------------------------------------------------------------ editor por regiões
export const MAX_REGIOES = 5;

/** Instrução de edição de UMA região. A segunda imagem enviada ao modelo é a máscara (branco = pode mudar). */
export function composeEdit(text: string): string {
  return [
    "Edit the first image. The second image is a mask: white pixels mark the ONLY area you are allowed to change; black pixels must stay exactly as they are.",
    `Change in the white area: ${text.trim()}.`,
    "Blend the change seamlessly: keep perspective, scale, lighting, shadows, reflections and style consistent with the rest of the image. Do not alter anything outside the white area.",
  ].join(" ");
}

// ------------------------------------------------------------------ multi-ângulo
export const ANGULOS = [
  { id: "e90", label: "Girar 90° à esquerda", az: -90, el: 0 },
  { id: "e45", label: "Girar 45° à esquerda", az: -45, el: 0 },
  { id: "d45", label: "Girar 45° à direita", az: 45, el: 0 },
  { id: "d90", label: "Girar 90° à direita", az: 90, el: 0 },
  { id: "topo", label: "Vista de cima", az: 0, el: 85 },
  { id: "baixo", label: "Vista de baixo", az: 0, el: -35 },
] as const;
export type AnguloId = (typeof ANGULOS)[number]["id"];

export const LENTES = {
  grande: { label: "Grande-angular", text: "wide-angle lens (about 24mm)" },
  normal: { label: "Normal", text: "standard lens (about 35mm)" },
  tele: { label: "Teleobjetiva", text: "telephoto lens (about 85mm), compressed perspective" },
} as const;
export type LenteKey = keyof typeof LENTES;

/** Descrição curta do ponto de vista, usada no rótulo do resultado. */
export function angleLabel(az: number, el: number): string {
  const partes: string[] = [];
  if (Math.abs(az) >= 5) partes.push(`${Math.abs(Math.round(az))}° ${az < 0 ? "à esquerda" : "à direita"}`);
  if (el >= 60) partes.push("vista de cima"); else if (el >= 10) partes.push("de cima"); else if (el <= -10) partes.push("de baixo");
  return partes.length ? partes.join(", ") : "mesmo ângulo";
}

export function composeAngle(o: { az: number; el: number; lens: LenteKey }): string {
  const mov: string[] = [];
  if (Math.abs(o.az) >= 5) mov.push(`orbit the camera ${Math.abs(Math.round(o.az))} degrees to the ${o.az < 0 ? "left" : "right"} around the subject`);
  if (o.el >= 60) mov.push("raise the camera to a top-down aerial view looking straight down");
  else if (o.el >= 10) mov.push(`raise the camera to a high angle (about ${Math.round(o.el)} degrees above the horizon)`);
  else if (o.el <= -10) mov.push(`lower the camera to a low angle looking up (about ${Math.abs(Math.round(o.el))} degrees below the horizon)`);
  return [
    "Show the exact same building or scene from a different camera position.",
    mov.length ? `Move the camera: ${mov.join(" and ")}.` : "Keep the same camera position.",
    `Use a ${LENTES[o.lens].text}.`,
    "Keep the architecture, proportions, materials, colors, landscaping and lighting identical to the supplied image; invent unseen sides in a way that is coherent with what is visible. Photorealistic architectural photography.",
  ].join(" ");
}
