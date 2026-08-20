import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

type TextDocumentPdfInput = {
  title: string;
  body: string;
  version: string;
  status: string;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 52;
const BODY_SIZE = 9.5;
const LINE_HEIGHT = 14;

export async function renderTextDocumentPdf(input: TextDocumentPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(input.title);
  pdf.setAuthor("SpaceOnCall");
  pdf.setSubject(`${input.status} / ${input.version}`);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages: PDFPage[] = [];
  let page = addPage(pdf, pages, input, regular, bold);
  let y = PAGE_HEIGHT - 140;

  for (const rawLine of input.body.split("\n")) {
    const line = toPdfText(rawLine.trimEnd());
    if (!line) {
      y -= 8;
      continue;
    }
    const heading = isHeading(line);
    const font = heading ? bold : regular;
    const size = heading ? 10.5 : BODY_SIZE;
    const color = heading ? rgb(0.08, 0.09, 0.1) : rgb(0.23, 0.25, 0.27);
    const wrapped = wrapLine(line, font, size, PAGE_WIDTH - MARGIN * 2);

    if (y - wrapped.length * LINE_HEIGHT < 62) {
      page = addPage(pdf, pages, input, regular, bold);
      y = PAGE_HEIGHT - 140;
    }

    if (heading) y -= 4;
    for (const segment of wrapped) {
      page.drawText(segment, { x: MARGIN, y, size, font, color });
      y -= LINE_HEIGHT;
    }
    if (heading) y -= 2;
  }

  pages.forEach((currentPage, index) => {
    currentPage.drawText(`${input.version} / Page ${index + 1} of ${pages.length}`, {
      x: MARGIN,
      y: 30,
      size: 7.5,
      font: regular,
      color: rgb(0.36, 0.38, 0.4)
    });
  });

  return pdf.save();
}

function addPage(
  pdf: PDFDocument,
  pages: PDFPage[],
  input: TextDocumentPdfInput,
  regular: PDFFont,
  bold: PDFFont
): PDFPage {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 10, width: PAGE_WIDTH, height: 10, color: rgb(1, 0.43, 0) });
  page.drawText("SPACEONCALL", { x: MARGIN, y: PAGE_HEIGHT - 48, size: 16, font: bold, color: rgb(0.06, 0.07, 0.08) });
  const titleLines = wrapLine(toPdfText(input.title), bold, 12, PAGE_WIDTH - MARGIN * 2).slice(0, 2);
  titleLines.forEach((line, index) => page.drawText(line, { x: MARGIN, y: PAGE_HEIGHT - 74 - index * 15, size: 12, font: bold, color: rgb(0.06, 0.07, 0.08) }));
  const statusY = PAGE_HEIGHT - 100 - Math.max(0, titleLines.length - 1) * 15;
  page.drawText(fitText(toPdfText(input.status), bold, 8.5, PAGE_WIDTH - MARGIN * 2), { x: MARGIN, y: statusY, size: 8.5, font: bold, color: rgb(0.78, 0.24, 0.03) });
  page.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - 122 }, end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 122 }, thickness: 0.8, color: rgb(0.75, 0.76, 0.77) });
  page.drawText("Pilot operational document", { x: PAGE_WIDTH - MARGIN - 100, y: 30, size: 7.5, font: regular, color: rgb(0.36, 0.38, 0.4) });
  return page;
}

function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).flatMap((word) => breakLongWord(word, font, size, maxWidth));
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function breakLongWord(word: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];
  const segments: string[] = [];
  let current = "";
  for (const character of word) {
    const candidate = current + character;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      segments.push(current);
      current = character;
    } else current = candidate;
  }
  if (current) segments.push(current);
  return segments;
}

function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let fitted = text;
  while (fitted && font.widthOfTextAtSize(`${fitted}...`, size) > maxWidth) fitted = fitted.slice(0, -1);
  return `${fitted}...`;
}

function isHeading(line: string): boolean {
  return line.length < 72 && line === line.toUpperCase();
}

function toPdfText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u2012-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7E]/g, "");
}
