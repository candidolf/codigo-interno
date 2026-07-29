import type { ReactElement } from "react";

/** Renderiza o texto do relatório (markdown simples) sem dependências externas. */
export function ReportContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactElement[] = [];
  let list: string[] = [];

  const flushList = (key: string) => {
    if (!list.length) return;
    blocks.push(
      <ul key={key} className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground my-3">
        {list.map((item, i) => (
          <li key={i}>{strip(item)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^\s*([-*•]|\d+\.)\s+/.test(line)) {
      list.push(line.replace(/^\s*([-*•]|\d+\.)\s+/, ""));
      return;
    }
    flushList(`l-${i}`);
    if (!line.trim()) return;
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      blocks.push(
        <h2
          key={i}
          className={`font-display font-bold ${level <= 2 ? "text-xl mt-6" : "text-lg mt-5"} first:mt-0`}
        >
          {strip(h[2])}
        </h2>,
      );
      return;
    }
    blocks.push(
      <p key={i} className="text-sm leading-relaxed text-muted-foreground mt-3">
        {strip(line)}
      </p>,
    );
  });
  flushList("l-end");

  return <div className="report-content">{blocks}</div>;
}

function strip(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\*\*|\*\*$/g, "");
}