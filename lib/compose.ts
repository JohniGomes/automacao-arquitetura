/**
 * Montagem dos prompts das ferramentas de imagem a partir das opções da tela (render, melhorar, esboço, ideias,
 * editor e multi-ângulo). Versão do arquivo "auditoria e novos prompts". Funções puras: rodam no navegador (para
 * mostrar o prompt) e no servidor (para gerar).
 *
 * Regras de montagem: os blocos são separados por uma linha em branco; blocos opcionais vazios somem por inteiro,
 * com o rótulo; texto livre do usuário é sempre subordinado às travas de geometria e câmera.
 */

export type Env = "exterior" | "interior";
export const AMBIENTE_ENV: Record<Env, string> = { exterior: "Exterior", interior: "Interior" };

/** Trava comum a todas as ferramentas: nada de texto, marcas ou pessoas reconhecíveis. */
export const NO_TEXT = "NO TEXT AND NO IDENTITY: do not add any text, signage, labels, logos, watermarks or readable license plates. Any people must be generic and non-identifiable (no recognizable real persons).";

const blocks = (...parts: (string | false | null | undefined)[]) => parts.filter((p): p is string => !!p && !!p.trim()).join("\n\n");

// ------------------------------------------------------------------ render
export const ESTILOS = {
  realista: {
    label: "Realista", desc: "Fotorrealista, com luz natural.",
    text: "Photorealistic material rendering with physically plausible surface response and natural lighting. Preserve the geometry and camera exactly.",
  },
  preciso: {
    label: "Preciso", desc: "Máxima fidelidade ao modelo.",
    text: "STRICT FIDELITY MODE: preserve all visible geometry, edges, openings, proportions, material boundaries, framing and camera placement. Make only the minimum changes required to render realistic surface appearance and lighting. Do not add decorative or architectural details.",
  },
  criativo: {
    label: "Criativo", desc: "Mais liberdade em materiais e atmosfera.",
    text: "CREATIVE MATERIAL MODE: allow tasteful variation in surface finishes, color nuance, planting and atmosphere only. Building geometry, openings, dimensions, layout, framing and camera remain locked. Do not interpret creative freedom as permission to redesign the building.",
  },
} as const;
export type EstiloKey = keyof typeof ESTILOS;

export const NIVEIS = [
  { label: "Leve", text: "Apply subtle material and lighting enhancement only. Stay as close as possible to the input." },
  { label: "Médio", text: "Apply balanced material realism, natural shadows and surface detail while preserving every architectural boundary." },
  { label: "Ultra", text: "Increase texture resolution, physically plausible material response, fine surface detail and lighting quality. Do not increase architectural complexity, invent details or alter geometry, camera or composition." },
] as const;

export const AMBIENTES_TEXT: Record<Env, string> = {
  exterior: `EXTERIOR MATERIALS AND SITE:
Apply realistic materials consistent with the materials and color boundaries visible or specified in the input. Do not force concrete, wood, stone, glass or any regional style if the source does not support it. Add realistic grass, planting, trees, paving or ground texture only in areas that are visibly part of the surrounding site and do not obscure or relocate the building. Match the original camera and view. For top-down, isometric or axonometric images, describe ground surfaces and vegetation from that same elevated viewpoint; do not introduce a horizon or a ground-level photographic composition.`,
  interior: `INTERIOR MATERIALS AND FURNISHINGS:
Improve material realism, lighting and visible furnishings while preserving the exact room layout, camera position, ceiling height, wall positions, doors, windows, built-in elements and circulation paths. Do not add or remove walls, openings, columns, stairs or built-in cabinetry. Furnish only where the input clearly indicates furniture or where the selected task explicitly permits adding furniture. Keep the same interior viewpoint and framing; do not widen the room or move the camera to reveal additional areas.`,
};

/**
 * Cenas de luz e clima do Render. Vocabulário comum com a variação de luz, separando iluminação de clima
 * (`kind: "clima"` aparece marcado na tela, porque muda a atmosfera além da luz). `swatch` é só a prévia colorida.
 */
export const CENAS_LUZ = [
  { id: "meiodia", kind: "luz", label: "Meio-dia", text: "bright overhead sunlight, short defined shadows, neutral daylight", swatch: "linear-gradient(160deg,#f6e7a8,#9fc7d9)" },
  { id: "manha", kind: "luz", label: "Manhã", text: "soft morning daylight, gentle short shadows, neutral-to-warm color temperature", swatch: "linear-gradient(160deg,#fbe9d0,#b9d6dd)" },
  { id: "poente", kind: "luz", label: "Pôr do sol", text: "SUNSET light: the sun is very low near the horizon, strongly warm orange-golden light, long dramatic warm shadows cast across the ground and facades, a warm glow on all lit surfaces and a subtle orange-pink color grade that clearly differs from midday or neutral daylight", swatch: "linear-gradient(160deg,#f2b57a,#8d5b78)" },
  { id: "blue", kind: "luz", label: "Blue hour", text: "cool blue ambient dusk light; existing interior lights may glow softly", swatch: "linear-gradient(160deg,#4a6fa5,#1f2f55)" },
  { id: "noite", kind: "luz", label: "Noite", text: "nighttime ambient lighting using existing visible fixtures only", swatch: "linear-gradient(160deg,#2c3550,#0e1424)" },
  { id: "nublado", kind: "clima", label: "Nublado", text: "soft diffuse overcast illumination, low contrast, subdued shadows", swatch: "linear-gradient(160deg,#cfd6d8,#98a4a8)" },
  { id: "chuva", kind: "clima", label: "Chuva", text: "rain-wet surfaces and soft grey ambient light, without changing building geometry or adding weather-related objects", swatch: "linear-gradient(160deg,#9aa9b2,#5d6e78)" },
] as const;
export type CenaLuzId = (typeof CENAS_LUZ)[number]["id"];

/** Elementos opcionais: só entram no prompt quando selecionados. */
export const ELEMENTOS = [
  { id: "pessoas", label: "Pessoas", text: "PEOPLE: at least 4 clearly visible, correctly scaled people (for example walking on the terrace, standing near the pool, on the lawn), large enough to be recognizable at this viewing distance" },
  { id: "carros", label: "Carros", text: "CARS: at least 2 clearly visible, correctly scaled parked cars on a driveway or parking area at the edge of the plot, outside the building footprint (if no driveway is drawn, add a simple paved driveway and parking area outside the house)" },
  { id: "vegetacao", label: "Vegetação", text: "VEGETATION: abundant, clearly visible trees, shrubs and grass in all available landscape areas, without covering or moving the building" },
  { id: "plantas", label: "Plantas e vasos", text: "potted plants only in plausible unoccupied areas, without blocking doors, windows or circulation" },
  { id: "decoracao", label: "Decoração", text: "restrained decorative objects only where appropriate and without changing built-in elements" },
  { id: "ceu", label: "Nuvens no céu", text: "CLOUDS: soft clouds in the sky (only applicable when a sky is visible in the view; if the view is top-down or has no sky, skip this item; never add a horizon or change the camera)" },
] as const;
export type ElementoId = (typeof ELEMENTOS)[number]["id"];

const INTRO_RENDER = `Render the first supplied image as a photorealistic visualization of the EXACT same architectural model. Treat the input image as a fixed geometric and camera reference, not as a suggestion for a redesign.

CAMERA LOCK:
Preserve the exact input viewpoint, camera position, camera orientation, projection type, perspective, framing, crop, image orientation and relative placement of all visible elements. Match the source view as closely as possible. If the input is isometric, axonometric, bird's-eye or top-down, keep that same type of view. If it is a street-level perspective or interior view, keep that same view. Never convert the image to a different camera angle or a ground-level view unless the user explicitly requests a camera change in a different tool.

GEOMETRY LOCK:
Keep every building volume, floor level, roof plane, slab edge, wall, opening, door, window, stair, railing, balcony, pool, deck and visible site boundary in EXACTLY the same position, shape, size and proportion as in the input. Do not add, remove, move, resize, rotate, straighten, simplify or reinterpret any architectural element. Preserve the visible plan layout and all material-boundary lines.

ALLOWED TRANSFORMATION:
Replace only unfinished/flat viewport appearance with realistic surface materials, physically plausible lighting, shadows, reflections and compatible environmental context. If the input background is empty, white or flat, fill the entire frame edge to edge with realistic surroundings (natural ground, grass, vegetation, soil), with no blank or overexposed areas. Keep the paved areas, deck and plot outline exactly as drawn: do not extend paving or buildings beyond the visible plot (the only exception is the minimal driveway needed for requested cars). Do not use realism as permission to redesign the architecture. If a detail is unclear, preserve its visible shape instead of inventing a new one.`;

const REFERENCIA_RENDER = "Use the second attached image ONLY as a reference for lighting, atmosphere and mood. Do not copy its architecture, camera, composition, objects, geometry, openings, landscaping layout or materials unless a material/lighting attribute is explicitly requested and is compatible with the first image. The first image remains the authority for geometry and camera.";

const FECHO_RENDER = `FINAL CHECK:
Same camera, same viewpoint, same framing, same building geometry and same positions of all visible architectural elements. No added, removed, moved or resized building volumes or openings. Realistic materials, physically plausible global illumination and natural shadows only. If realism conflicts with source fidelity, source fidelity wins for the architecture and camera. Every lighting, atmosphere and addition explicitly requested above is mandatory and must be clearly visible. NO TEXT AND NO IDENTITY: do not add any text, signage, labels, logos, watermarks or readable license plates. Any people must be generic and non-identifiable (no recognizable real persons).`;

export type RenderOpts = { style: EstiloKey; level: number; env: Env; guidance: string; scene: string; elements: string[]; sceneFree?: string; reference: boolean };

export function composeRender(o: RenderOpts): string {
  const scene = CENAS_LUZ.find((s) => s.id === o.scene);
  const light = o.sceneFree?.trim() ? `Lighting and atmosphere: ${o.sceneFree.trim()}.`
    : scene ? `Lighting and atmosphere: ${scene.text}.`
    // com imagem de referência (que já define luz e atmosfera) não se impõe uma luz padrão
    : o.reference ? ""
    : o.env === "exterior" ? "Soft late-afternoon sunlight." : "Balanced natural daylight.";
  const els = ELEMENTOS.filter((e) => o.elements.includes(e.id)).map((e) => e.text);
  return blocks(
    INTRO_RENDER,
    AMBIENTES_TEXT[o.env],
    light,
    els.length > 0 && `REQUIRED ADDITIONS (the user explicitly selected these; every one of them MUST be clearly visible in the final image, never omitted):\n${els.join("\n")}.\nPlace them in plausible areas at a scale consistent with the scene. They must not cover, replace, move or alter any building volume, wall, opening or roof. Do not add categories of objects that were not requested. These additions and the requested lighting take priority over the style and level instructions that follow (for example over any instruction to avoid adding details), but never over the geometry and camera locks. An item marked "only applicable" may be skipped when the view makes it impossible.`,
    o.reference && REFERENCIA_RENDER,
    ESTILOS[o.style].text,
    NIVEIS[Math.min(2, Math.max(0, o.level))].text,
    o.guidance.trim() && `Additional user preference, subordinate to all geometry, camera and scope restrictions above: ${o.guidance.trim()}`,
    FECHO_RENDER,
  );
}

// --------------------------------------------------------- melhorar render
export const MELHORIAS = {
  refinamento: { label: "Refinamento", desc: "Mais elegância e equilíbrio visual.", text: "Refine surface details, edge clarity, material transitions and visual balance without changing the design." },
  fidelidade: { label: "Fidelidade", desc: "Melhora a qualidade mantendo o original.", text: "Prioritize faithful reproduction of the original image. Improve only rendering artifacts, material clarity and lighting quality." },
  realismo: { label: "Realismo", desc: "Aproxima a imagem de uma fotografia.", text: "Improve physically plausible materials, reflections, shadows and subtle surface imperfections. Do not add depth-of-field blur that hides important architecture." },
  premium: { label: "Premium", desc: "Visual sofisticado para o projeto.", text: "Create a polished premium presentation through refined materials, controlled lighting and restrained color grading. Do not add or redesign architectural features." },
  iluminacao: { label: "Iluminação", desc: "Ajusta a luz para a cena ficar equilibrada.", text: "Improve exposure, light balance, shadow softness and highlight control. Do not change the time-of-day appearance more than necessary, and do not add physical light fixtures." },
} as const;
export type MelhoriaKey = keyof typeof MELHORIAS;

const LIBERDADE = [
  "MINIMAL CHANGE: do not add or remove any object. Preserve all materials and colors as closely as possible. Improve only technical image quality, exposure and subtle rendering defects.",
  "MODERATE VISUAL REFINEMENT: allow restrained improvements to materials, colors, lighting and surface details. Do not change architecture, object positions, camera or framing.",
  "HIGH VISUAL CREATIVITY WITH ARCHITECTURE LOCKED: allow bolder material palettes, lighting, color grading and non-structural styling. Building geometry, openings, layout, object placement, camera and framing remain unchanged.",
] as const;

export function composeMelhorar(o: { preset: MelhoriaKey; creativity: number; guidance: string }): string {
  // o preset Fidelidade pede "manter o original": limita a liberdade a no máximo moderada
  const c = o.preset === "fidelidade" ? Math.min(o.creativity, 66) : o.creativity;
  const liberdade = c < 34 ? LIBERDADE[0] : c < 67 ? LIBERDADE[1] : LIBERDADE[2];
  return blocks(
    "Improve the supplied architectural render while treating it as the fixed reference for architecture and camera.",
    `STRICT PRESERVATION:
Keep the exact same camera position, camera orientation, projection, perspective, framing, crop and composition. Preserve all visible building volumes, floor levels, rooflines, slab edges, walls, doors, windows, stairs, railings, furniture positions, pool edges, landscaping boundaries and material boundaries in the same positions and proportions. Do not add, remove, move, resize or redesign any architectural element.`,
    `IMPROVEMENT TARGET:\n${MELHORIAS[o.preset].text}`,
    `CREATIVE RANGE:\n${liberdade}`,
    "Apply improvements only within the allowed range. Even at high creativity, do not change building geometry, openings, layout, camera or framing. Creativity may affect only materials, color grading, lighting, surface detail and non-structural styling unless the user explicitly requests a permitted local change.",
    o.guidance.trim() && `USER GUIDANCE:\nAdditional user preference, subordinate to all preservation rules: ${o.guidance.trim()}`,
    `QUALITY:
Improve material response, realistic shadows, exposure, reflections and fine details without introducing artificial depth of field that obscures architectural elements. Avoid excessive bloom, oversharpening, distorted straight lines, invented openings, warped edges and decorative clutter.`,
    `FINAL CHECK:
The output must be recognizably the same image and the same design, with improved rendering quality rather than a redesigned project. If any improvement conflicts with preservation, preserve the original. NO TEXT AND NO IDENTITY: do not add any text, signage, labels, logos, watermarks or readable license plates. Any people must be generic and non-identifiable (no recognizable real persons).`,
  );
}

// ------------------------------------------------------------------ esboço
export const ESTILOS_ARQ = ["Moderno", "Contemporâneo", "Minimalista", "Rústico", "Clássico", "Industrial", "Tropical", "Escandinavo"] as const;
const ESTILO_EN: Record<string, string> = { Moderno: "Modern", Contemporâneo: "Contemporary", Minimalista: "Minimalist", Rústico: "Rustic", Clássico: "Classic", Industrial: "Industrial", Tropical: "Tropical", Escandinavo: "Scandinavian" };
export const styleEn = (s: string) => ESTILO_EN[s] || s;

export function composeEsboco(o: { env: Env; estilo: string; detalhes: string }): string {
  const estilo = ESTILOS_ARQ.includes(o.estilo as never) ? styleEn(o.estilo) : "";
  return blocks(
    "Convert the supplied hand-drawn architectural sketch or line drawing into a photorealistic architectural visualization.",
    `CONSERVATIVE DRAWING INTERPRETATION:
Treat the visible lines, outlines and proportions as the primary design instructions. Preserve the drawing's viewpoint, perspective, framing, silhouette, relative dimensions, floor levels, rooflines, walls, openings and spatial layout. Do not add, remove, move or resize building volumes, floors, doors, windows, columns, stairs or structural elements. Do not invent new openings or hidden rooms. If a line or detail is ambiguous, preserve its visible shape and interpret it conservatively rather than inventing a new architectural feature.`,
    `CAMERA:
Keep the exact viewpoint and projection implied by the sketch. Do not convert an axonometric or bird's-eye drawing into an eye-level photograph. Do not add a horizon or sky if it changes the intended view.`,
    `ENVIRONMENT:\n${o.env === "interior" ? "Choose plausible, realistic finishes, furniture and lighting for the room the drawing shows; the drawing does not specify materials, so pick them to suit the style. Furnish only where the drawing indicates furniture." : "Choose plausible, realistic materials and site context that suit the style; the drawing does not specify materials. Add ground, grass, planting and paving only where the drawing indicates a site."}`,
    estilo && `ARCHITECTURAL STYLE:\n${estilo}`,
    o.detalhes.trim() && `USER DETAILS:\n${o.detalhes.trim()}`,
    `Use physically plausible materials, realistic global illumination, natural shadows and coherent scale. The selected architectural style may influence finishes, colors, textures and non-structural decoration only; it must not override the sketch geometry.`,
    `FINAL CHECK:
The result must read as a realistic rendering of this drawing, not as a new design inspired by it. Preserve the camera and all visible architectural relationships. NO TEXT AND NO IDENTITY: do not add any text, signage, labels, logos, watermarks or readable license plates. Any people must be generic and non-identifiable (no recognizable real persons).`,
  );
}

// ------------------------------------------------------------------ ideias
export const TIPOS_IDEIA: Record<Env, string[]> = {
  exterior: ["Fachada", "Paisagismo", "Área externa e piscina"],
  interior: ["Sala", "Cozinha", "Quarto", "Banheiro", "Home office"],
};
const TIPO_EN: Record<string, string> = { Fachada: "Facade", Paisagismo: "Landscaping", "Área externa e piscina": "Outdoor area and pool", Sala: "Living room", Cozinha: "Kitchen", Quarto: "Bedroom", Banheiro: "Bathroom", "Home office": "Home office" };
export const tipoEn = (t: string) => TIPO_EN[t] || t;

export function composeIdeia(o: { env: Env; tipo: string; estilo: string; detalhes: string; reference: boolean }): string {
  return blocks(
    "Create one architectural design variation based on Image 1.",
    `IMAGE ROLES:
Image 1 is the base project and remains the authority for building geometry, camera, composition and all elements outside the requested scope. If Image 2 is supplied, use it only as inspiration for mood, palette and materials; do not copy its building geometry, layout, openings or camera.`,
    `REQUESTED VARIATION:
Category to vary: ${tipoEn(o.tipo)}
Architectural style: ${styleEn(o.estilo)}${o.detalhes.trim() ? `\nAdditional user details: ${o.detalhes.trim()}` : ""}`,
    `SCOPE CONTROL:
Change only elements that belong to the selected category. Do not interpret this request as permission to redesign the entire project.

- If the selected category is landscaping or outdoor/pool area, preserve the building, facade, roof, windows, doors, pool outline and hardscape boundaries; vary only the permitted landscape or outdoor styling elements.
- If the selected category is facade, allow surface finishes, colors, cladding patterns and non-structural facade styling within existing boundaries. Preserve all volumes, floor levels, rooflines, doors and window positions and sizes.
- If the selected category is an interior room, preserve the room envelope, walls, openings, ceiling height, built-ins and camera. Vary only finishes, furniture and decoration within the selected room.
- Do not change any element outside the selected category unless the user explicitly requests it and the change is compatible with the source.`,
    `CAMERA AND GEOMETRY:
Keep the same camera position, projection, perspective, framing and composition. Keep all architectural volumes and openings in exactly the same locations. Do not convert the view to eye level or invent unseen parts of the project.`,
    `VISUAL QUALITY:
Create a coherent, photorealistic variation with believable materials, natural lighting, accurate scale and restrained, purposeful design decisions. If a reference image conflicts with the base project, the base project wins for geometry and the reference may influence only mood/materials.`,
    `FINAL CHECK:\nThis is a controlled design variation of the supplied project, not a replacement design. NO TEXT AND NO IDENTITY: do not add any text, signage, labels, logos, watermarks or readable license plates. Any people must be generic and non-identifiable (no recognizable real persons).`,
  );
}

// ------------------------------------------------------------ editor por regiões
export const MAX_REGIOES = 5;

/** Instrução de edição de UMA região. Imagem 1 = imagem atual; imagem 2 = máscara (branco = pode mudar). */
export function composeEdit(text: string): string {
  return blocks(
    "Edit Image 1 using Image 2 as a strict edit mask.",
    `MASK SEMANTICS:
White pixels in Image 2 are the ONLY region allowed to change. Black pixels must remain identical to Image 1. Do not interpret grey or antialiased boundary pixels as permission for broad changes; keep any transition as narrow as possible.`,
    `REQUESTED CHANGE INSIDE THE MASK:\n${text.trim()}`,
    `PRESERVE OUTSIDE THE MASK:
Every pixel outside the authorized white region must remain unchanged. Do not modify the camera, framing, geometry, materials, objects, lighting, shadows, reflections or colors outside the mask. Do not let the requested change spill into adjacent areas.`,
    `LOCAL COHERENCE:
Inside the allowed region, match perspective, scale, lighting direction, shadow softness, reflections, material style and image sharpness to the surrounding scene. Preserve any architectural edges that cross the mask boundary unless the instruction explicitly requests changing that edge and the changed area is inside the mask.`,
    "If the requested change cannot be completed without modifying pixels outside the mask, make the smallest possible change within the mask and preserve everything else.",
  );
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

/** Altura a partir da qual a vista de cima (top-down) prevalece sobre o giro. */
const TOPDOWN_EL = 60;

/** Descrição curta do ponto de vista, usada no rótulo do resultado. */
export function angleLabel(az: number, el: number): string {
  if (el >= TOPDOWN_EL) return "vista de cima";
  const partes: string[] = [];
  if (Math.abs(az) >= 5) partes.push(`${Math.abs(Math.round(az))}° ${az < 0 ? "à esquerda" : "à direita"}`);
  if (el >= 10) partes.push("de cima"); else if (el <= -10) partes.push("de baixo");
  return partes.length ? partes.join(", ") : "mesmo ângulo";
}

/** Pedido único de câmera, sem instruções contraditórias: a vista de cima prevalece quando a altura é alta. */
export function cameraRequest(az: number, el: number): string {
  if (el >= TOPDOWN_EL) return "Raise the camera to a top-down aerial view looking straight down at the project.";
  const orbit = Math.abs(az) >= 5 ? `orbit the camera ${Math.abs(Math.round(az))} degrees to the ${az < 0 ? "left" : "right"} around the subject` : "";
  const height = el >= 10 ? `raise the camera to a high angle (about ${Math.round(el)} degrees above the horizon)`
    : el <= -10 ? `lower the camera to a low angle looking up (about ${Math.abs(Math.round(el))} degrees below the horizon)` : "";
  if (!orbit && !height) return "Keep the same camera position and viewpoint.";
  return `Move the camera only as follows: ${[orbit, height].filter(Boolean).join(" and ")}.`;
}

export function composeAngle(o: { az: number; el: number; lens: LenteKey }): string {
  return blocks(
    "Generate a new view of the same architectural project from the requested camera position.",
    `SOURCE AUTHORITY:
The supplied image is the authority for every visible architectural feature. Preserve all known geometry, proportions, floor levels, rooflines, openings, facade materials, colors and landscape elements. Do not redesign the project to suit the new view.`,
    `CAMERA REQUEST:\n${cameraRequest(o.az, o.el)}\nLens: ${LENTES[o.lens].text}`,
    `KNOWN VS. UNKNOWN GEOMETRY:
Keep every feature that is visible in the source consistent with the source. For faces and spaces not visible in the source, do not present invented details as verified facts. Infer only the minimum plausible continuation needed to produce the requested view, consistent with the visible building. Do not invent additional floors, windows, doors, balconies, roof forms or structural volumes. Where the unseen geometry is materially uncertain, prefer a conservative, simple continuation over elaborate invention.`,
    `MATERIAL CONTINUITY:
Keep each known facade/material assignment consistent. Do not transfer a material from one facade to another without evidence. Preserve landscape, pool and paving boundaries where their geometry is known.`,
    `CAMERA:
Move the camera only as specified. Do not change the building dimensions or use camera movement as an excuse to alter the design. Use the requested lens character while avoiding exaggerated distortion.`,
    `OUTPUT:
Create one coherent image of the requested view. Photorealistic materials and lighting are desirable, but visual realism must not be mistaken for verified geometric accuracy. NO TEXT AND NO IDENTITY: do not add any text, signage, labels, logos, watermarks or readable license plates. Any people must be generic and non-identifiable (no recognizable real persons).`,
  );
}
