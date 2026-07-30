export async function downloadReportPdf(opts: {
  content: string;
  testandoName: string;
  createdAt?: string | null;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = margin;

  const newPageIfNeeded = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Relatório de Análise Emocional", margin, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(110);
  const date = opts.createdAt ? new Date(opts.createdAt) : new Date();
  doc.text(`${opts.testandoName} · ${date.toLocaleDateString("pt-BR")}`, margin, y);
  y += 18;
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 22;
  doc.setTextColor(20);

  const lines = opts.content.split("\n");
  for (const raw of lines) {
    const line = raw.replace(/\*\*/g, "").trimEnd();
    if (!line.trim()) {
      y += 8;
      continue;
    }
    const heading = /^#{1,6}\s/.test(line);
    const text = heading ? line.replace(/^#{1,6}\s*/, "") : line;
    doc.setFont("helvetica", heading ? "bold" : "normal");
    doc.setFontSize(heading ? 13 : 11);
    const wrapped = doc.splitTextToSize(text, maxW) as string[];
    for (const w of wrapped) {
      newPageIfNeeded(16);
      doc.text(w, margin, y);
      y += heading ? 18 : 15;
    }
    if (heading) y += 4;
  }

  const safe = opts.testandoName.normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase();
  doc.save(`relatorio-${safe || "teste"}-${date.toISOString().slice(0, 10)}.pdf`);
}