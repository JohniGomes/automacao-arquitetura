export const PROMPT_MAPA =
  "Renderize essa imagem do Google Earth para uma apresentação realista, como se fosse uma foto de drone. Em seguida, adicione ilustrações de forma realista, marcando nessa foto a localização de shoppings, farmácias, mercados, parque, academia, etc.";

export const PROMPT_RENDER =
  "Transform the supplied architectural model screenshot into a photorealistic architectural visualization. Preserve the original building geometry, rooflines, window positions, proportions, camera angle and composition. Use exposed architectural concrete, natural wood, realistic glass reflections, tropical Brazilian landscaping and soft late-afternoon sunlight. Physically plausible materials, realistic global illumination, natural shadows, professional architectural photography, high detail, no structural modifications.";

export const LUZES = {
  manha: { label: "Manhã", text: "morning: soft diffused light, short shadows, fresh clear sky" },
  golden: { label: "Golden hour", text: "golden hour: low warm sun, long soft shadows, warm glow on the facade" },
  blue: { label: "Blue hour", text: "blue hour: deep blue sky with the interior lights switched on, glowing windows" },
  noite: { label: "Noite", text: "night: soft architectural lighting, bollard lights, illuminated pool, dark sky" },
} as const;
export type LuzKey = keyof typeof LUZES;

export const promptLuz = (descricao: string) =>
  `Keep the house, camera and composition identical. Change only the lighting to ${descricao}. Do not alter geometry, materials, landscaping or framing.`;

export const AMBIENTES = {
  cozinha: { label: "Cozinha", en: "KITCHEN", itens: "wooden cutting board, ceramic bowl, stone countertop sample, matte black faucet, copper pot, wooden spoons, fresh herbs, linen kitchen towel, tile sample" },
  sala: { label: "Sala", en: "LIVING ROOM", itens: "miniature linen sofa, cushion, wooden coffee table, throw blanket, table lamp, woven rug sample, vase with foliage, book, leather sample" },
  banheiro: { label: "Banheiro", en: "BATHROOM", itens: "folded white towel, stone soap dish, ceramic basin, matte black faucet, bath mat, wooden tray, glass bottle, fern, stone sample" },
  quarto: { label: "Quarto", en: "BEDROOM", itens: "linen bedding, pillow, wool blanket, wooden headboard sample, bedside lamp, ceramic base, book, dried grass, curtain sample" },
} as const;
export type AmbienteKey = keyof typeof AMBIENTES;

export const promptMoodboard = (amb: AmbienteKey) =>
  `Use the attached moodboard image ONLY as a layout reference: vertical 2:3 flat-lay on a white background, overlapping items in an asymmetric composition, soft studio light, and four rounded pill-shaped color swatches in a row at the bottom. REPLACE ALL of its content: do not reuse its objects, and do not use its navy blue palette. Every item must clearly belong to a ${AMBIENTES[amb].en}: ${AMBIENTES[amb].itens}. Colors and materials taken from the attached house render. No text, no logos, no watermark.`;

const KEEP = "Preserve the building geometry, facade, window positions, materials and landscaping. Realistic reflections. Avoid structural deformation and flickering materials.";
export const CENAS = {
  aerea: { label: "Aérea", img: "Same house, wide aerial view of the house and its surroundings in the late afternoon, photorealistic architectural photography.", video: `Slow aerial push-in toward the house, late afternoon light. ${KEEP}` },
  fachada: { label: "Fachada", img: "Same house, frontal view of the main facade, eye level, photorealistic architectural photography.", video: `Smooth frontal tracking shot along the main facade. ${KEEP}` },
  acesso: { label: "Acesso", img: "Same house, close approach to the entrance and access path, photorealistic architectural photography.", video: `Controlled dolly-in toward the entrance. ${KEEP}` },
  interior: { label: "Interior", img: "Same house, interior of the living room opening onto the garden, photorealistic interior photography.", video: `Slow lateral tracking inside the living room, opening to the garden. ${KEEP}` },
  materiais: { label: "Materiais", img: "Same house, detail close-up of materials (concrete, wood, stone, glass), photorealistic macro architectural photography.", video: `Gentle push-in on material details (concrete, wood, stone, glass). ${KEEP}` },
  entardecer: { label: "Entardecer", img: "Same house, wide view at dusk with interior and exterior lights on, photorealistic architectural photography.", video: `Slow pull-back to a wide view at dusk. ${KEEP}` },
} as const;
export type CenaKey = keyof typeof CENAS;
