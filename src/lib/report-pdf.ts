import { parseReportDocument } from "@/lib/report-schema";

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
  const date = opts.createdAt ? new Date(opts.createdAt) : new Date();
  const page = () => {
    doc.addPage();
    y = margin;
  };
  const ensure = (height: number) => {
    if (y + height > pageH - margin) page();
  };
  const line = (value: string, size = 10.5, bold = false, gap = 14) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(35);
    for (const part of doc.splitTextToSize(value, maxW) as string[]) {
      ensure(gap);
      doc.text(part, margin, y);
      y += gap;
    }
  };
  const heading = (value: string, size = 16) => {
    ensure(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(55, 30, 110);
    doc.text(value, margin, y);
    y += size + 9;
  };
  const list = (values: unknown[]) =>
    values.forEach((v) => line(`• ${String(v)}`, 10.5, false, 14));
  const report = (() => {
    try {
      return parseReportDocument(opts.content);
    } catch {
      return null;
    }
  })();
  doc.setFillColor(71, 42, 145);
  doc.rect(0, 0, pageW, 115, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  doc.text("Código Interno", margin, 55);
  doc.setFontSize(17);
  doc.text("Resultado oficial", margin, 82);
  y = 155;
  line(opts.testandoName, 22, true, 25);
  line(date.toLocaleDateString("pt-BR"), 10.5, false, 16);
  y += 18;
  if (report) {
    const sections: [string, unknown][] = [
      ["Quem você é", report.identidade],
      ["Seu mapa psicológico", report.mapa_psicologico],
      ["Sua sombra e seu dom oculto", report.sombra_e_dom],
      ["Como você funciona", report.como_funciona],
      ["Profissões + estilo de vida", report.profissoes_estilo_de_vida],
      ["O que desenvolver", report.desenvolvimento],
      ["Missão dos próximos 12 meses", report.missao_12_meses],
      ["Manual dos pais", report.manual_dos_pais],
      ["Mensagem final", report.mensagem_final],
      ["Seu card de identidade", report.card_identidade],
    ];
    sections.forEach(([title, value]) => {
      heading(title);
      renderValue(value, line, list, heading);
      y += 12;
    });
  } else {
    opts.content.split("\n").forEach((raw) => {
      const value = raw.trim();
      if (!value) {
        y += 7;
        return;
      }
      const h = value.match(/^#{1,6}\s+(.*)$/);
      if (h) heading(h[1], 14);
      else line(value.replace(/\*\*/g, ""));
    });
  }
  const safe = opts.testandoName
    .normalize("NFD")
    .replace(/[^\w]+/g, "-")
    .toLowerCase();
  doc.save(`relatorio-${safe || "teste"}-${date.toISOString().slice(0, 10)}.pdf`);
}

function renderValue(
  value: unknown,
  line: (value: string, size?: number, bold?: boolean, gap?: number) => void,
  list: (values: unknown[]) => void,
  heading: (value: string, size?: number) => void,
) {
  if (typeof value === "string" || typeof value === "number") {
    if (String(value).trim()) line(String(value));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === "string" || typeof item === "number") list([item]);
      else renderValue(item, line, list, heading);
    });
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    if (key === "schema_version") return;
    const label = key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
    if (Array.isArray(item)) {
      heading(label, 11);
      renderValue(item, line, list, heading);
    } else if (item && typeof item === "object") {
      heading(label, 11);
      renderValue(item, line, list, heading);
    } else if (item !== undefined && item !== null && String(item).trim())
      line(`${label}: ${String(item)}`);
  });
}
