import { notFound } from "next/navigation";
import { getLegalDocument, legalDocumentFilename, renderLegalDocumentText } from "@/src/lib/legal-documents";
import { renderTextDocumentPdf } from "@/src/lib/pdf-document";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  const document = getLegalDocument((await context.params).slug);
  if (!document) notFound();
  const bytes = await renderTextDocumentPdf({
    title: document.title,
    body: renderLegalDocumentText(document),
    version: document.version,
    status: "DRAFT - LAWYER REVIEW REQUIRED"
  });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `attachment; filename="${legalDocumentFilename(document)}"`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
