import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

/** Memorial descritivo a partir de uma foto: prompt, texto de exemplo (modo mock) e arquivo Word. Só roda no servidor (as opções da tela ficam em memorialOpcoes). */

export type MemorialDados = { nome: string; local: string; tipo: string; area: string; padrao: string; notas: string };

/** Instrução enviada ao modelo de texto com visão, junto com a foto. A saída é em português do Brasil, em Markdown simples. */
export function promptMemorial(d: MemorialDados): string {
  const dado = (rotulo: string, v: string) => (v ? `- ${rotulo}: ${v}` : `- ${rotulo}: (não informado)`);
  return `You are an experienced Brazilian architect writing a MEMORIAL DESCRITIVO (project specification document) for the building shown in the supplied photo or render.

Write the whole document in Brazilian Portuguese, in a formal and technical tone, as an architect would deliver to a client, a builder or a permit office.

PROJECT DATA GIVEN BY THE USER (use it exactly; do not contradict it):
${dado("Nome do projeto", d.nome)}
${dado("Localização", d.local)}
${dado("Tipo de edificação", d.tipo)}
${dado("Área construída aproximada", d.area ? `${d.area} m²` : "")}
${dado("Padrão de acabamento", d.padrao)}
${d.notas ? `- Observações do autor: ${d.notas}` : ""}

HOW TO WRITE IT:
- Describe what is actually visible in the image: volumes, roof type, cladding and finishing materials and colors, openings and frames, glazing, floors, outdoor areas, landscaping, pool, lighting, and so on.
- For systems that cannot be seen (foundations, structure, electrical, plumbing, HVAC, waterproofing), write the usual solution for this type of building and standard of finish, and mark it clearly as "a confirmar em projeto".
- NEVER invent exact measurements, quantities, brands, product codes or norm numbers you are not sure about. Where a precise value is unknown, write "a definir em projeto". Refer to "normas técnicas da ABNT vigentes" in general terms.
- Use short paragraphs and bullet lists. Be complete and organized, with between 900 and 1600 words.

OUTPUT FORMAT (Markdown only, no preamble, no code fences):
# MEMORIAL DESCRITIVO
(one line with the project name and location)

Then these numbered sections, each as "## N. TITLE", in this order:
## 1. IDENTIFICAÇÃO DO PROJETO
## 2. OBJETIVO
## 3. DESCRIÇÃO GERAL DO PROJETO
## 4. SISTEMA CONSTRUTIVO E ESTRUTURA
## 5. VEDAÇÕES E ALVENARIAS
## 6. COBERTURA
## 7. ESQUADRIAS E VIDROS
## 8. REVESTIMENTOS, PISOS E FORROS
## 9. PINTURA
## 10. INSTALAÇÕES (ELÉTRICA, HIDROSSANITÁRIA E CLIMATIZAÇÃO)
## 11. LOUÇAS, METAIS E BANCADAS
## 12. ÁREAS EXTERNAS E PAISAGISMO
## 13. CONSIDERAÇÕES FINAIS

In section 13, state that this memorial was prepared from an image and from the data informed, that items marked "a confirmar em projeto" or "a definir em projeto" must be checked by the technical professional responsible, and that it does not replace the executive project, the technical responsibility document (RRT or ART) or the legal approvals.
Use "- " for bullet items and **bold** only for item names. Do not use tables.`;
}

/** Texto de exemplo para o modo mock (sem chave da IA). */
export function memorialMock(d: MemorialDados): string {
  const nome = d.nome || "Projeto de exemplo";
  return `# MEMORIAL DESCRITIVO
${nome}${d.local ? ` — ${d.local}` : ""}

## 1. IDENTIFICAÇÃO DO PROJETO
- **Projeto:** ${nome}
- **Tipo:** ${d.tipo || "a definir em projeto"}
- **Área construída aproximada:** ${d.area ? `${d.area} m²` : "a definir em projeto"}
- **Padrão de acabamento:** ${d.padrao || "a definir em projeto"}

## 2. OBJETIVO
Este memorial descreve as características da edificação e os materiais previstos. (Texto de exemplo do modo mock: não é uma saída real de IA.)

## 3. DESCRIÇÃO GERAL DO PROJETO
Volume em um pavimento, com cobertura plana e grandes aberturas voltadas para a área externa.

## 13. CONSIDERAÇÕES FINAIS
Itens marcados como "a confirmar em projeto" devem ser verificados pelo responsável técnico.
`;
}

/** Divide **negrito** em trechos para o Word. */
function trechos(texto: string, base: { bold?: boolean } = {}): TextRun[] {
  return texto.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p) =>
    p.startsWith("**") && p.endsWith("**") ? new TextRun({ text: p.slice(2, -2), bold: true }) : new TextRun({ text: p, bold: base.bold }));
}

/** Converte o Markdown simples do memorial em um arquivo .docx (A4, fonte Calibri 11). */
export async function memorialDocx(markdown: string): Promise<Buffer> {
  const filhos: Paragraph[] = [];
  for (const bruta of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const l = bruta.trimEnd();
    if (!l.trim()) continue;
    if (l.startsWith("# ")) filhos.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: l.slice(2).trim(), bold: true })] }));
    else if (l.startsWith("## ")) filhos.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 100 }, children: [new TextRun({ text: l.slice(3).trim(), bold: true })] }));
    else if (l.startsWith("### ")) filhos.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 80 }, children: [new TextRun({ text: l.slice(4).trim(), bold: true })] }));
    else if (/^\s*[-*] /.test(l)) filhos.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: trechos(l.replace(/^\s*[-*] /, "")) }));
    else filhos.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 }, children: trechos(l) }));
  }
  const doc = new Document({
    creator: "Croqui",
    title: "Memorial descritivo",
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1417, bottom: 1417, left: 1417, right: 1417 } } }, children: filhos }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
