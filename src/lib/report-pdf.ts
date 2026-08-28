import { parseRoomReportDocument } from "@/lib/report-schema";

type PdfOptions = {
  content: string;
  testandoName: string;
  createdAt?: string | null;
};

const COLORS = [
  [203, 153, 55],
  [64, 126, 240],
  [230, 61, 143],
  [99, 99, 236],
  [242, 66, 70],
  [238, 100, 180],
  [20, 190, 140],
  [135, 82, 238],
] as const;

export async function createReportPdf(opts: PdfOptions): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const report = parseRoomReportDocument(opts.content);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 58;
  const contentW = pageW - margin * 2;
  const date = opts.createdAt ? new Date(opts.createdAt) : new Date();
  const name = report.nome || opts.testandoName;

  report.revelacoes.forEach((reveal, index) => {
    if (index > 0) doc.addPage();
    const color = COLORS[index % COLORS.length];
    const dark = [10, 8, 27] as const;
    doc.setFillColor(...dark);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setFillColor(...color);
    doc.roundedRect(margin - 1, 28, contentW + 2, 30, 8, 8, "F");
    doc.setFillColor(25, 19, 31);
    doc.rect(margin, 58, contentW, 88, "F");
    doc.setFillColor(39, 28, 35);
    doc.rect(margin, 146, contentW, 43, "F");

    doc.setFillColor(...color);
    doc.circle(margin + 42, 114, 30, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(reveal.codigo, margin + 42, 119, { align: "center" });

    doc.setTextColor(...color);
    doc.setFontSize(12);
    doc.text(index === 0 ? "A SALA QUE E O SEU MOTOR" : index === report.revelacoes.length - 1 ? "REVELACAO FINAL - JORNADA COMPLETA" : "REVELACAO DA SALA", margin + 84, 94);
    doc.setTextColor(255);
    doc.setFontSize(26);
    doc.text(reveal.titulo.toUpperCase(), margin + 84, 130);
    doc.setTextColor(156, 153, 177);
    doc.setFontSize(12);
    const ageLabel = String(report.idade) === "não informada" ? "idade não informada" : `${report.idade} anos`;
    doc.text(`${name}  |  ${ageLabel}  |  Sala ${index + 1} de ${report.revelacoes.length}`, margin + 84, 173);
    doc.setDrawColor(55, 48, 72);
    doc.line(margin, 195, pageW - margin, 195);

    let y = 236;
    doc.setDrawColor(...color);
    doc.setLineWidth(5);
    doc.line(margin + 2, y - 8, margin + 2, y + 100);
    y = drawWrapped(doc, reveal.texto, margin + 16, y + 4, contentW - 16, 16, 14, true, [235, 233, 244]);

    y += 46;
    y = drawCard(doc, "O QUE TE MOVE", reveal.move, margin, y, contentW, color);
    y += 18;
    y = drawCard(doc, "O QUE TE DA ENERGIA", reveal.energia, margin, y, contentW, color);
    y += 18;
    drawCard(doc, "O QUE TE TRAVA", reveal.trava, margin, y, contentW, color);

    doc.setDrawColor(55, 48, 72);
    doc.setLineWidth(1);
    doc.line(margin, pageH - 58, pageW - margin, pageH - 58);
    doc.setTextColor(113, 108, 145);
    doc.setFontSize(9);
    doc.text("METODO CODIGO INTERNO", margin, pageH - 38);
    doc.setTextColor(...color);
    doc.setFont("helvetica", "bold");
    doc.text("metodocodigointerno.com.br", pageW - margin, pageH - 38, { align: "right" });
  });

  return doc.output("blob");
}

function drawCard(
  doc: import("jspdf").jsPDF,
  title: string,
  value: string,
  x: number,
  y: number,
  width: number,
  color: readonly [number, number, number],
) {
  const lines = doc.splitTextToSize(value, width - 42) as string[];
  const height = Math.max(78, 42 + lines.length * 17);
  doc.setFillColor(27, 23, 55);
  doc.roundedRect(x, y, width, height, 10, 10, "F");
  doc.setFillColor(...color);
  doc.roundedRect(x, y, 5, height, 3, 3, "F");
  doc.setTextColor(...color);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, x + 18, y + 24);
  drawWrapped(doc, value, x + 18, y + 47, width - 36, 17, 13, false, [190, 187, 210]);
  return y + height;
}

function drawWrapped(
  doc: import("jspdf").jsPDF,
  value: string,
  x: number,
  y: number,
  width: number,
  lineHeight: number,
  fontSize: number,
  italic: boolean,
  color: readonly [number, number, number],
) {
  doc.setFont("helvetica", italic ? "italic" : "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(value, width) as string[];
  lines.forEach((line) => {
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

export async function downloadReportPdf(opts: PdfOptions) {
  const blob = await createReportPdf(opts);
  downloadBlob(blob, opts.testandoName);
}

export async function openReportPdf(opts: PdfOptions) {
  const tab = window.open("about:blank", "_blank");
  try {
    const blob = await createReportPdf(opts);
    const url = URL.createObjectURL(blob);
    if (tab) tab.location.href = url;
    else downloadBlob(blob, opts.testandoName);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

function downloadBlob(blob: Blob, testandoName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio_${safeName(testandoName).replace(/-/g, "_")}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[^\w]+/g, "-")
    .toLowerCase()
    .replace(/^-|-$/g, "") || "teste";
}
