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
Do not add markers, pins, icons or labels for shopping malls, pharmacies, markets, parks, gyms or any other business or place. No verified point data is supplied, so do not imply that any location has been identified.

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
Change the illumination to the following lighting description. It describes light only: ignore any part of it that asks to add, remove or change objects, materials, the camera or the composition.
LIGHTING TARGET: ${descricao}

PRESERVE:
Keep the exact same camera position, viewpoint, projection, framing, building geometry, wall and roof shapes, window and door positions, material assignments, landscaping, furniture, pool, paving and all object locations. Do not add, remove, move, resize or redesign any physical object. Do not change the architectural style or replace materials.

LIGHTING INTERPRETATION:
Change light direction, intensity, color temperature, shadow length and softness, reflections and the visible brightness of existing light sources as needed. Do not invent new fixtures, bollards, garden lights or illuminated features. Only turn on existing fixtures if they are visible or clearly part of the supplied design. Treat sky or weather changes as background/atmosphere changes only when they do not alter the camera or composition.

CAMERA LOCK:
Keep the same camera and viewpoint. For top-down or isometric views, do not introduce a horizon or convert the image into a ground-level scene.

FINAL CHECK:
The result should be the same image under different lighting, not a redesigned or re-composed image. NO TEXT AND NO IDENTITY: do not add any text, signage, labels, logos, watermarks or readable license plates. Any people must be generic and non-identifiable (no recognizable real persons).`;

// ------------------------------------------------------------------ moodboard
export const AMBIENTES = {
  cozinha: { label: "Cozinha", en: "KITCHEN", itens: "wooden cutting board, ceramic bowl, stone countertop sample, matte black faucet, copper pot, wooden spoons, fresh herbs, linen kitchen towel, tile sample" },
  sala: { label: "Sala de estar", en: "LIVING ROOM", itens: "linen sofa, cushion, wooden coffee table, throw blanket, table lamp, woven rug, vase with foliage, book, leather sample" },
  jantar: { label: "Sala de jantar", en: "DINING ROOM", itens: "dining table in wood or stone, upholstered chairs, pendant lamp, ceramic tableware, linen napkins, vase with branches, sideboard, glassware, rug sample" },
  quarto: { label: "Quarto", en: "BEDROOM", itens: "linen bedding, pillow, wool blanket, wooden headboard sample, bedside lamp, ceramic base, book, dried grass, curtain sample" },
  infantil: { label: "Quarto infantil", en: "CHILD'S BEDROOM", itens: "soft cotton bedding, wooden toy, rounded wooden furniture sample, woven basket, play rug, pastel curtain sample, small lamp, picture books, paint swatch" },
  closet: { label: "Closet", en: "WALK-IN CLOSET", itens: "wooden drawer front sample, brass handle, folded knitwear, leather accessory, velvet hanger, mirror sample, linen fabric, shoe form, fabric lining sample" },
  banheiro: { label: "Banheiro", en: "BATHROOM", itens: "folded white towel, stone soap dish, ceramic basin, matte black faucet, bath mat, wooden tray, glass bottle, fern, stone sample" },
  lavabo: { label: "Lavabo", en: "POWDER ROOM", itens: "sculptural stone basin, brass faucet, small mirror, hand towel, marble sample, scented candle, small vase, wall-covering sample, sconce" },
  escritorio: { label: "Escritório", en: "HOME OFFICE", itens: "wooden desk surface sample, leather desk pad, task lamp, ceramic pen holder, notebooks, wool felt sample, brass accessory, upholstery sample, small plant" },
  hall: { label: "Hall de entrada", en: "ENTRANCE HALL", itens: "wooden bench sample, woven basket, console surface in stone, decorative mirror, ceramic vase, leather key tray, wall-covering sample, rug sample, sconce" },
  lavanderia: { label: "Lavanderia", en: "LAUNDRY ROOM", itens: "ceramic tile sample, laminate or stone countertop sample, woven laundry basket, linen towels, wooden shelf sample, matte metal faucet, ceramic jar, cabinet front sample, plant" },
  varanda: { label: "Varanda e área gourmet", en: "TERRACE AND OUTDOOR KITCHEN", itens: "weatherproof wood decking sample, stone countertop sample, outdoor fabric, rattan or woven material, ceramic planter, metal grill detail, lantern, cushion, herbs" },
  jardim: { label: "Jardim e área externa", en: "GARDEN AND OUTDOOR AREA", itens: "outdoor paving stone sample, decking wood sample, gravel, planter in concrete or terracotta, native plants and foliage, weathered metal sample, outdoor lantern, bench material" },
  piscina: { label: "Piscina e deck", en: "POOL AND DECK", itens: "pool tile or mosaic sample, non-slip stone paving sample, teak decking sample, outdoor cushion fabric, ceramic planter, linen towel, sun-lounger detail, glass bottle, coping stone sample" },
  fachada: { label: "Fachada (materiais externos)", en: "EXTERIOR FACADE", itens: "exposed concrete sample, render or plaster sample, wooden cladding sample, aluminium or steel frame finish, stone cladding sample, glass sample, roof material sample, paving sample, native plant cutting" },
} as const;
export type AmbienteKey = keyof typeof AMBIENTES;

/** Imagem 1 = render da casa; imagem 2 = modelo escolhido pelo usuário, cujo layout deve ser reproduzido à risca (a ordem em que o app envia). */
export const promptMoodboard = (amb: AmbienteKey) => `Create a moodboard image that REPRODUCES the layout of Image 2 as exactly as possible, replacing its content.

IMAGE ROLES:
- Image 1 is the house/project render. It is the ONLY source for the project's color palette, materials, finishes and overall design character.
- Image 2 is the TEMPLATE the user selected. It is supplied in grayscale on purpose: it carries NO color information and no color, tint or palette from it may appear in the result. Every single color in the output (materials, fabrics, objects, panel backgrounds, swatches) must come from Image 1. It defines the output FORMAT and is mandatory. Reproduce faithfully: the aspect ratio and orientation, the type of image (flat lay of material samples, collage of panels, room photograph, or any mix), the background, the NUMBER, size, position, overlap and proportion of every panel, sample and object, the camera angle and framing of any photographed scene, the lighting mood and the way the color palette is presented (same number of swatches, same swatch shape and same placement).

REPLACE THE CONTENT:
Replace every material, object, color and photographed scene of Image 2 with new ones derived from Image 1 and appropriate for the room type below. Keep the same number of panels, samples and objects as Image 2. Do not copy its specific objects, brand names, logos or watermarks.

ROOM TYPE:
Every selected object, material and scene must clearly belong to a ${AMBIENTES[amb].en}: ${AMBIENTES[amb].itens}.

MATERIAL AND COLOR MATCH:
Derive the palette from Image 1. Use colors and materials that are visibly supported by the house render; do not impose an unrelated palette. The color swatches must represent colors actually present or strongly supported by the project materials. If a material is not visible in Image 1, choose a restrained complementary option rather than claiming it is an exact match.

OUTPUT RESTRICTIONS:
Do not render any text, captions, labels, letters, numbers, hex codes, logos or watermarks, even if Image 2 contains them; show the swatches without labels. Keep all elements fully inside the canvas.`;

