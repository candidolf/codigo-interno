import { parseReportDocument, parseRoomReportDocument } from "@/lib/report-schema";

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

async function createRoomReportPdf(opts: PdfOptions): Promise<Blob> {
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
    const color = COLORS[index % COLORS.length]!;
    const dark = [10, 8, 27] as const;
    doc.setFillColor(...dark);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(margin - 1, 28, contentW + 2, 30, 8, 8, "F");
    doc.setFillColor(25, 19, 31);
    doc.rect(margin, 58, contentW, 88, "F");
    doc.setFillColor(39, 28, 35);
    doc.rect(margin, 146, contentW, 43, "F");

    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(margin + 42, 114, 30, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(reveal.codigo, margin + 42, 119, { align: "center" });

    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFontSize(12);
    doc.text(
      index === 0
        ? "A SALA QUE E O SEU MOTOR"
        : index === report.revelacoes.length - 1
          ? "REVELACAO FINAL - JORNADA COMPLETA"
          : "REVELACAO DA SALA",
      margin + 84,
      94,
    );
    doc.setTextColor(255);
    doc.setFontSize(26);
    doc.text(reveal.titulo.toUpperCase(), margin + 84, 130);
    doc.setTextColor(156, 153, 177);
    doc.setFontSize(12);
    const ageLabel =
      String(report.idade) === "não informada" ? "idade não informada" : `${report.idade} anos`;
    doc.text(
      `${name}  |  ${ageLabel}  |  Sala ${index + 1} de ${report.revelacoes.length}`,
      margin + 84,
      173,
    );
    doc.setDrawColor(55, 48, 72);
    doc.line(margin, 195, pageW - margin, 195);

    let y = 236;
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(5);
    doc.line(margin + 2, y - 8, margin + 2, y + 100);
    y = drawWrapped(
      doc,
      reveal.texto,
      margin + 16,
      y + 4,
      contentW - 16,
      16,
      14,
      true,
      [235, 233, 244],
    );

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
    doc.setTextColor(color[0], color[1], color[2]);
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

export async function createReportPdf(opts: PdfOptions): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const report = parseReportDocument(opts.content);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  const purple = [91, 65, 180] as const;
  const gold = [203, 153, 55] as const;
  const ink = [38, 34, 51] as const;
  const muted = [98, 92, 116] as const;
  let y = 56;

  const addContentPage = () => {
    doc.addPage();
    doc.setFillColor(250, 249, 253);
    doc.rect(0, 0, pageW, pageH, "F");
    y = 54;
  };
  const ensureSpace = (height: number) => {
    if (y + height > pageH - 56) addContentPage();
  };
  const linesFor = (text: string, width = contentW, fontSize = 10) => {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, width) as string[];
  };
  const paragraph = (
    text: string,
    options: { label?: string; color?: readonly [number, number, number]; italic?: boolean } = {},
  ) => {
    const labelHeight = options.label ? 20 : 0;
    const lines = linesFor(text, contentW - 24, 10);
    const height = labelHeight + lines.length * 15 + 24;
    ensureSpace(height);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(228, 224, 238);
    doc.roundedRect(margin, y, contentW, height, 8, 8, "FD");
    let textY = y + 19;
    if (options.label) {
      doc.setTextColor(...(options.color ?? purple));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(options.label.toUpperCase(), margin + 12, textY);
      textY += 20;
    }
    doc.setTextColor(...ink);
    doc.setFont("helvetica", options.italic ? "italic" : "normal");
    doc.setFontSize(10);
    doc.text(lines, margin + 12, textY, { lineHeightFactor: 1.45 });
    y += height + 10;
  };
  const section = (title: string, subtitle?: string, forcePage = false) => {
    if (forcePage || y > pageH - 150) addContentPage();
    doc.setTextColor(...purple);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text(title, margin, y);
    y += 17;
    if (subtitle) {
      doc.setTextColor(...muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(subtitle, margin, y);
      y += 18;
    } else {
      y += 7;
    }
  };
  const bullets = (
    label: string,
    items: string[],
    color: readonly [number, number, number] = purple,
  ) => {
    if (!items.length) return;
    const text = items.map((item) => `• ${item}`).join("\n");
    paragraph(text, { label, color });
  };
  const titledCards = (items: { titulo: string; descricao: string }[]) => {
    for (const item of items) paragraph(item.descricao, { label: item.titulo });
  };
  const metrics = (
    label: string,
    items: { nome: string; percentual: number; classificacao?: string; descricao?: string }[],
  ) => {
    if (!items.length) return;
    ensureSpace(32);
    doc.setTextColor(...purple);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label.toUpperCase(), margin, y);
    y += 16;
    for (const item of items) {
      const description = [item.classificacao, item.descricao].filter(Boolean).join(" - ");
      const lines = description ? linesFor(description, contentW - 96, 8) : [];
      const height = Math.max(34, 22 + lines.length * 11);
      ensureSpace(height + 7);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(228, 224, 238);
      doc.roundedRect(margin, y, contentW, height, 7, 7, "FD");
      doc.setTextColor(...ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(item.nome, margin + 11, y + 16);
      doc.setTextColor(...purple);
      doc.text(`${item.percentual}%`, pageW - margin - 11, y + 16, { align: "right" });
      if (lines.length) {
        doc.setTextColor(...muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(lines, margin + 11, y + 29, { lineHeightFactor: 1.3 });
      }
      y += height + 7;
    }
    y += 4;
  };

  // Capa oficial.
  doc.setFillColor(13, 9, 35);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setTextColor(...gold);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("RESULTADO OFICIAL", pageW / 2, 92, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("MÉTODO CÓDIGO INTERNO", pageW / 2, 120, { align: "center" });
  doc.setFontSize(28);
  doc.text(opts.testandoName, pageW / 2, 290, { align: "center", maxWidth: contentW });
  doc.setTextColor(...gold);
  doc.setFontSize(12);
  doc.text(`CÓDIGO: ${report.identidade.codigo ?? "—"}`, pageW / 2, 320, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text(report.identidade.titulo, pageW / 2, 385, { align: "center", maxWidth: contentW });
  if (report.identidade.subtitulo) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(13);
    doc.text(report.identidade.subtitulo, pageW / 2, 420, { align: "center", maxWidth: contentW });
  }
  const identityMeta = [
    report.identidade.temperamento,
    report.identidade.arquetipo,
    report.identidade.inteligencia,
    report.identidade.raridade,
  ].filter(Boolean);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(198, 192, 218);
  doc.text(identityMeta.join("  •  "), pageW / 2, 485, { align: "center", maxWidth: contentW });

  addContentPage();
  section("Quem Você É", "Seu arquétipo principal e essência profunda");
  paragraph(report.identidade.descricao, { label: report.identidade.titulo, italic: false });
  bullets("Arquétipos secundários", report.identidade.arquetipos_secundarios);

  section("Seu Mapa Psicológico", "Temperamentos, inteligências e padrões profundos", true);
  metrics("Os 4 temperamentos", report.mapa_psicologico.temperamentos);
  metrics("Inteligências múltiplas", report.mapa_psicologico.inteligencias);
  section("Sua Sombra e Seu Dom Oculto", "O padrão que limita e o tesouro que ele esconde", true);
  paragraph(report.sombra_e_dom.sombra, { label: "A sombra", color: [212, 62, 118] });
  paragraph(report.sombra_e_dom.dom_oculto, {
    label: "O dom oculto por trás",
    color: [22, 151, 120],
  });
  if (report.sombra_e_dom.fechamento) paragraph(report.sombra_e_dom.fechamento, { italic: true });

  section("Como Você Funciona", "O que dá energia, o que drena e como aprende", true);
  bullets("O que te dá energia", report.como_funciona.energiza, [22, 151, 120]);
  bullets("O que te drena", report.como_funciona.drena, [212, 62, 118]);
  titledCards(report.como_funciona.aprende_melhor);

  section("Profissões + Estilo de Vida", "Não é só a profissão: é como viver dentro dela", true);
  for (const career of report.profissoes_estilo_de_vida) {
    ensureSpace(70);
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(career.titulo, margin, y);
    if (career.compatibilidade != null) {
      doc.setTextColor(...purple);
      doc.text(`${career.compatibilidade}%`, pageW - margin, y, { align: "right" });
    }
    y += 12;
    paragraph(career.descricao);
    titledCards(career.estilos_de_vida);
    bullets("Áreas de atuação", career.areas);
    if (career.faixas_salariais.length) {
      const salaryText = career.faixas_salariais
        .map((row) => `${row.nivel}: ${row.faixa}${row.observacao ? ` - ${row.observacao}` : ""}`)
        .join("\n");
      paragraph(salaryText, { label: "Faixas salariais" });
    }
    y += 8;
  }

  section("O Que Desenvolver", "As próximas versões de você", true);
  titledCards(report.desenvolvimento);
  section("Missão dos Próximos 12 Meses", "Ações concretas, não apenas planos");
  titledCards(
    report.missao_12_meses.map((item) => ({
      titulo: `${item.numero}. ${item.titulo}`,
      descricao: item.descricao,
    })),
  );

  section("Manual dos Pais", "Como se relacionar, motivar e apoiar da forma certa", true);
  paragraph(report.manual_dos_pais.como_aprende, { label: "Como aprende" });
  paragraph(report.manual_dos_pais.reage_sob_pressao, { label: "Como reage sob pressão" });
  paragraph(report.manual_dos_pais.linguagem_que_chega, { label: "A linguagem que chega" });
  bullets("O que fazer", report.manual_dos_pais.fazer, [22, 151, 120]);
  bullets("O que evitar", report.manual_dos_pais.evitar, [212, 62, 118]);

  section("Mensagem Final", undefined, true);
  paragraph(report.mensagem_final, { italic: true });

  addContentPage();
  doc.setFillColor(13, 9, 35);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setTextColor(...gold);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SEU CARD DE IDENTIDADE", pageW / 2, 105, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.text(report.card_identidade.titulo.toUpperCase(), pageW / 2, 220, {
    align: "center",
    maxWidth: contentW,
  });
  if (report.card_identidade.subtitulo) {
    doc.setTextColor(...gold);
    doc.setFontSize(12);
    doc.text(report.card_identidade.subtitulo, pageW / 2, 252, {
      align: "center",
      maxWidth: contentW,
    });
  }
  doc.setTextColor(225, 221, 238);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(13);
  doc.text(report.card_identidade.frase, pageW / 2, 320, { align: "center", maxWidth: contentW });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(report.card_identidade.tracos.join("  •  "), pageW / 2, 400, {
    align: "center",
    maxWidth: contentW,
  });
  const cardMetrics = report.card_identidade.metricas
    .map((metric) => `${metric.nome} ${metric.percentual}`)
    .join("     ");
  doc.setTextColor(...gold);
  doc.setFont("helvetica", "bold");
  doc.text(cardMetrics, pageW / 2, 475, { align: "center", maxWidth: contentW });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(page === 1 || page === totalPages ? 150 : 113, 108, 145);
    doc.text("MÉTODO CÓDIGO INTERNO", margin, pageH - 24);
    doc.text(`${page}/${totalPages}  •  metodocodigointerno.com.br`, pageW - margin, pageH - 24, {
      align: "right",
    });
  }
  return doc.output("blob");
}

export async function downloadIdentityCardPdf(opts: PdfOptions) {
  const { jsPDF } = await import("jspdf");
  const report = parseReportDocument(opts.content);
  const doc = new jsPDF({ unit: "pt", format: "a6" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(12, 9, 30);
  doc.roundedRect(12, 12, w - 24, h - 24, 18, 18, "F");
  doc.setTextColor(203, 153, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CÓDIGO INTERNO · RESULTADO OFICIAL", w / 2, 42, { align: "center" });
  doc.setTextColor(255);
  doc.setFontSize(22);
  doc.text(report.card_identidade.titulo.toUpperCase(), w / 2, 120, {
    align: "center",
    maxWidth: w - 52,
  });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(12);
  doc.text(report.card_identidade.frase, w / 2, 156, { align: "center", maxWidth: w - 52 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    report.card_identidade.metricas.map((x) => `${x.nome}: ${x.percentual}`).join("\n"),
    36,
    220,
  );
  doc.setTextColor(203, 153, 55);
  doc.text("metodocodigointerno.com.br", w / 2, h - 36, { align: "center" });
  downloadBlob(doc.output("blob"), `${opts.testandoName}-card`);
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
  return (
    value
      .normalize("NFD")
      .replace(/[^\w]+/g, "-")
      .toLowerCase()
      .replace(/^-|-$/g, "") || "teste"
  );
}
