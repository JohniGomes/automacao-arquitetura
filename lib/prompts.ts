/**
 * Prompts das ferramentas de apresentação (mapa, moodboard, luz, filme). Versão do arquivo "auditoria e novos prompts".
 * Os da família render (render, melhorar, esboço, ideias, editor, multi-ângulo) ficam em compose.ts.
 * Os prompts ainda precisam ser validados com IA real, ferramenta por ferramenta.
 */

// ------------------------------------------------------------------ mapa de situação
export const PROMPT_MAPA = `Transform the supplied satellite/map image into a clear, realistic aerial visualization for an architectural site-presentation board.

SOURCE-IMAGE FIDELITY:
Use the supplied image as the geographic and compositional base. Preserve the visible street network, block boundaries, building footprints, road directions, intersections, terrain features and relative positions exactly as shown. Do not rotate, reframe, relocate, invent, remove or redesign existing streets, blocks or buildings. Keep the same top-down or oblique aerial viewpoint as the source; do not switch to a ground-level view.

VISUAL ENHANCEMENT:
Improve legibility, surface detail, vegetation and realistic aerial texture without changing the underlying geography. Keep the output aligned with the source image and suitable for an architectural presentation.

POINTS OF INTEREST — IMPORTANT:
Do not invent or guess the locations, names, footprints or existence of shopping malls, pharmacies, markets, parks, gyms or other businesses. Only mark points of interest if their verified locations and labels are supplied separately by the application. If no verified point data is provided, do not add specific business markers or imply that any location has been verified.

ANNOTATION STYLE:
When verified point data is supplied, place simple, legible, consistently styled markers at the supplied coordinates. Do not move markers to make the image look more attractive. Keep labels readable and avoid covering important roads or buildings where possible.

No fabricated labels, logos, road names, addresses or geographic features. Preserve the source framing and orientation.`;

// ------------------------------------------------------------------ variação de luz
/** Textos de iluminação da ferramenta de variação de luz (mudam só a luz, sem criar objetos). */
export const LUZES = {
  manha: { label: "Manhã", text: "soft morning illumination, neutral-to-warm color temperature, gentle shadows" },
  golden: { label: "Golden hour", text: "low warm sunlight, longer warm shadows consistent with the existing sun direction and scene" },
  blue: { label: "Blue hour", text: "cool ambient dusk illumination; gently illuminate only existing interior lights and fixtures" },
  noite: { label: "Noite", text: "nighttime illumination using existing fixtures and visible light sources only; do not invent new lamps or architectural lighting" },
} as const;
export type LuzKey = keyof typeof LUZES;

export const promptLuz = (descricao: string) => `Relight the supplied architectural render. The original image is the fixed reference for geometry, materials, objects and camera.

CHANGE ONLY LIGHTING:
Change the illumination to the following target: ${descricao}

PRESERVE:
Keep the exact same camera position, viewpoint, projection, framing, building geometry, wall and roof shapes, window and door positions, material assignments, landscaping, furniture, pool, paving and all object locations. Do not add, remove, move, resize or redesign any physical object. Do not change the architectural style or replace materials.

LIGHTING INTERPRETATION:
Change light direction, intensity, color temperature, shadow length and softness, reflections and the visible brightness of existing light sources as needed. Do not invent new fixtures, bollards, garden lights or illuminated features. Only turn on existing fixtures if they are visible or clearly part of the supplied design. Treat sky or weather changes as background/atmosphere changes only when they do not alter the camera or composition.

CAMERA LOCK:
Keep the same camera and viewpoint. For top-down or isometric views, do not introduce a horizon or convert the image into a ground-level scene.

FINAL CHECK:
The result should be the same image under different lighting, not a redesigned or re-composed image.`;

// ------------------------------------------------------------------ moodboard
export const AMBIENTES = {
  cozinha: { label: "Cozinha", en: "KITCHEN", itens: "wooden cutting board, ceramic bowl, stone countertop sample, matte black faucet, copper pot, wooden spoons, fresh herbs, linen kitchen towel, tile sample" },
  sala: { label: "Sala", en: "LIVING ROOM", itens: "miniature linen sofa, cushion, wooden coffee table, throw blanket, table lamp, woven rug sample, vase with foliage, book, leather sample" },
  banheiro: { label: "Banheiro", en: "BATHROOM", itens: "folded white towel, stone soap dish, ceramic basin, matte black faucet, bath mat, wooden tray, glass bottle, fern, stone sample" },
  quarto: { label: "Quarto", en: "BEDROOM", itens: "linen bedding, pillow, wool blanket, wooden headboard sample, bedside lamp, ceramic base, book, dried grass, curtain sample" },
} as const;
export type AmbienteKey = keyof typeof AMBIENTES;

/** Imagem 1 = render da casa; imagem 2 = layout do moodboard (a ordem em que o app envia). */
export const promptMoodboard = (amb: AmbienteKey) => `Create a vertical 2:3 architectural interior-design moodboard.

IMAGE ROLES:
- Image 1 is the house/project render. It is the ONLY source for the project's existing color palette, materials, finishes and overall design character.
- Image 2 is a layout reference ONLY. Use it only for the white background, vertical 2:3 flat-lay format, asymmetric overlapping arrangement, soft studio lighting and four rounded color-swatch pills aligned in a row at the bottom.

Do not copy objects, colors, text, logos, watermarks or branding from Image 2. Replace all of its content.

ROOM TYPE:
Every selected object must clearly belong to a ${AMBIENTES[amb].en}: ${AMBIENTES[amb].itens}.

MATERIAL AND COLOR MATCH:
Derive the moodboard palette from Image 1. Use colors and materials that are visibly supported by the house render; do not impose an unrelated palette. The four color swatches must represent colors actually present or strongly supported by the project materials. If a material is not visible, choose a restrained complementary option rather than claiming it is an exact match.

COMPOSITION:
Arrange the room-related material samples, furniture/accessory objects and finishes as a refined editorial flat lay on a clean white background. Use an asymmetric but balanced composition with natural overlap, clear separation between objects and soft studio shadows. Keep all objects fully inside the canvas. Place exactly four rounded pill-shaped color swatches in one horizontal row at the bottom.

OUTPUT RESTRICTIONS:
No text, captions, labels, letters, numbers, logos, watermark, border or extra swatches. Do not show a room scene or perspective interior; this must remain a flat-lay moodboard.`;

// ------------------------------------------------------------------ filme do projeto
/** Instrução para criar a "bíblia visual" (descrição de continuidade reaproveitada em todas as cenas). */
export const PROMPT_BIBLIA = `Analyze the supplied project image and establish a concise visual continuity specification for use in every scene. Record only features actually visible or explicitly supplied: building massing, number of visible levels, roof forms, facade materials and colors, window/door patterns, pool and landscape features, and distinctive proportions. Do not guess hidden dimensions, unseen facade details or interior layouts. Treat unknown features as unknown. Reuse this same specification unchanged for every scene in this project.

Return only the specification, as a short list of bullet points (maximum 150 words), with no preamble.`;

export const PRESERVAR = `CONTINUITY LOCK:
Preserve the same building geometry, visible facade, window and door positions, rooflines, materials, colors, landscaping and object locations throughout every frame. Keep temporal consistency in lighting, reflections and shadows. No morphing, warping, flickering materials, object popping, duplicated openings, changing roof shapes or structural deformation. Camera motion must be smooth and controlled. If motion conflicts with structural stability, reduce the motion.`;

/** Referência extra enviada como imagem 2 em cenas que dependem dela. */
export type CenaRef = "interior" | "fachada" | "acesso";
export const REF_LABEL: Record<CenaRef, string> = { interior: "Imagem interior", fachada: "Imagem da fachada principal", acesso: "Imagem do acesso" };

/** Quando existe referência dedicada, o prompt de imagem recebe este prefixo (imagem 1 = projeto, imagem 2 = referência). */
export const REF_PREFIX = "Image 1 is the main project image. Image 2 is a dedicated reference for this view and is the authority for this view's geometry and layout.\n\n";

export const CENAS = {
  aerea: {
    label: "Aérea",
    img: "Create a wide 16:9 elevated aerial view of the same supplied architectural project and its visible surroundings. Preserve the recognizable building massing, roof geometry, openings, materials and site layout from the source. Use an elevated aerial viewpoint; do not create a ground-level composition. Do not invent additional building volumes or alter the site layout. Apply late-afternoon lighting without changing the architecture. Follow the project's shared visual continuity specification.",
    video: `Slow, smooth aerial push-in toward the building. Keep the building silhouette, rooflines, facade openings, landscape layout and materials temporally stable. No morphing, geometry changes, flicker, object popping, camera jumps or newly appearing structures.\n\n${PRESERVAR}`,
  },
  fachada: {
    label: "Fachada", ref: "fachada" as CenaRef,
    img: "Create a 16:9 view of the main facade of the same supplied architectural project. Use the main facade only if it can be identified from the supplied image or an additional facade reference. Preserve visible facade proportions, floor levels, roofline, door/window count, positions, sizes, materials and colors. Do not invent a new facade design. If the main facade cannot be identified confidently from the source, use the closest supported visible view instead of fabricating a front elevation. Follow the shared visual continuity specification.",
    video: `Use a very slow, controlled frontal camera move along the visible main facade. Keep all visible windows, doors, slab edges, rooflines, materials and proportions stable from frame to frame. Do not reveal or invent unsupported facade sections. No morphing, flicker, object popping or structural deformation.\n\n${PRESERVAR}`,
  },
  acesso: {
    label: "Acesso", ref: "acesso" as CenaRef,
    img: "Create a 16:9 closer view of the entrance and access path only if these features are visible in the supplied image or provided in a dedicated reference. Preserve their location, shape, materials and relationship to the building. Do not invent a new entrance, stairs, doors, canopy or access path. Maintain consistency with the shared visual continuity specification.",
    video: `Perform a controlled, slow dolly-in toward the visible entrance and access path. Keep the entrance geometry, door position, steps, paving and adjacent facade stable. Do not create new objects or alter the building. No flicker, morphing, geometry drift or sudden camera movement.\n\n${PRESERVAR}`,
  },
  interior: {
    label: "Interior", ref: "interior" as CenaRef, requiresRef: true,
    img: "Create a 16:9 interior view only when a corresponding interior image or reliable interior reference is supplied. Preserve the room envelope, ceiling height, openings, built-ins, materials and layout shown by that reference. Do not fabricate an interior from an exterior-only image. If no interior reference exists, mark this scene as requiring an interior input rather than presenting an invented room as the actual project.",
    video: `Use a slow lateral camera move inside the supplied and verified interior reference. Keep the room envelope, ceiling, doors, windows, built-ins, furniture positions and materials stable. Do not create new rooms or reveal unsupported spaces. No flicker, morphing, geometry drift or object popping.\n\n${PRESERVAR}`,
  },
  materiais: {
    label: "Materiais",
    img: "Create a 16:9 close-up of materials that are visibly present in the supplied project. Show only supported materials and finishes; do not introduce concrete, wood, stone, glass or other materials that are not evidenced by the source. Preserve their color and finish character. This is a detail view, so camera distance may change, but the material identity must remain consistent with the shared visual continuity specification.",
    video: `Perform a gentle, controlled push-in toward the existing material details. Preserve the identity, color, texture and boundaries of every visible material. Avoid melting, crawling, flickering or changing textures. No new objects or material substitutions.\n\n${PRESERVAR}`,
  },
  entardecer: {
    label: "Entardecer",
    img: "Create a 16:9 view of the same supplied project at dusk. Preserve building massing, facade, roof, openings, landscape layout, materials and camera viewpoint as far as supported by the source. Change the lighting and visible illumination only; do not add new architectural lighting fixtures or redesign the facade. Follow the shared visual continuity specification.",
    video: `Perform a slow pull-back to a wider dusk view. Keep the building geometry, openings, materials, landscape and existing light fixtures stable. Maintain consistent dusk lighting without flickering windows, appearing/disappearing lights or structural deformation.\n\n${PRESERVAR}`,
  },
} as const;
export type CenaKey = keyof typeof CENAS;
/** Tipo de uma cena com os campos opcionais, para uso genérico. */
export type CenaDef = { label: string; img: string; video: string; ref?: CenaRef; requiresRef?: boolean };
