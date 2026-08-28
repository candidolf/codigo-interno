import { z } from "zod";

export const REPORT_SCHEMA_VERSION = 1;

const textList = z.array(z.string().trim()).default([]);

const metricList = z
  .array(
    z.object({
      nome: z.string().trim(),
      percentual: z.number().min(0).max(100),
      classificacao: z.string().trim().optional(),
      descricao: z.string().trim().optional(),
    }),
  )
  .default([]);

const careerSchema = z.object({
  titulo: z.string().trim(),
  compatibilidade: z.number().min(0).max(100).optional(),
  descricao: z.string().trim(),
  estilos_de_vida: z
    .array(
      z.object({
        titulo: z.string().trim(),
        descricao: z.string().trim(),
      }),
    )
    .default([]),
  areas: textList,
  faixas_salariais: z
    .array(
      z.object({
        nivel: z.string().trim(),
        faixa: z.string().trim(),
        observacao: z.string().trim().optional(),
      }),
    )
    .default([]),
});

export const ReportDocumentSchema = z.object({
  schema_version: z.number().int().default(REPORT_SCHEMA_VERSION),
  identidade: z.object({
    titulo: z.string().trim(),
    subtitulo: z.string().trim().optional(),
    descricao: z.string().trim(),
    arquetipos_secundarios: textList,
    temperamento: z.string().trim().optional(),
    arquetipo: z.string().trim().optional(),
    inteligencia: z.string().trim().optional(),
    raridade: z.string().trim().optional(),
    codigo: z.string().trim().optional(),
  }),
  mapa_psicologico: z.object({
    temperamentos: metricList,
    inteligencias: metricList,
  }),
  sombra_e_dom: z.object({
    sombra: z.string().trim(),
    dom_oculto: z.string().trim(),
    fechamento: z.string().trim().optional(),
  }),
  como_funciona: z.object({
    energiza: textList,
    drena: textList,
    aprende_melhor: z
      .array(
        z.object({
          titulo: z.string().trim(),
          descricao: z.string().trim(),
        }),
      )
      .default([]),
  }),
  profissoes_estilo_de_vida: z.array(careerSchema).default([]),
  desenvolvimento: z
    .array(
      z.object({
        titulo: z.string().trim(),
        descricao: z.string().trim(),
      }),
    )
    .default([]),
  missao_12_meses: z
    .array(
      z.object({
        numero: z.number().int().positive(),
        titulo: z.string().trim(),
        descricao: z.string().trim(),
      }),
    )
    .default([]),
  manual_dos_pais: z.object({
    como_aprende: z.string().trim(),
    reage_sob_pressao: z.string().trim(),
    linguagem_que_chega: z.string().trim(),
    fazer: textList,
    evitar: textList,
  }),
  mensagem_final: z.string().trim(),
  card_identidade: z.object({
    titulo: z.string().trim(),
    subtitulo: z.string().trim().optional(),
    frase: z.string().trim(),
    tracos: textList,
    metricas: metricList,
  }),
});

export type ReportDocument = z.infer<typeof ReportDocumentSchema>;

const roomRevealSchema = z.object({
  titulo: z.string().trim(),
  codigo: z.string().trim(),
  texto: z.string().trim(),
  move: z.string().trim(),
  energia: z.string().trim(),
  trava: z.string().trim(),
});

export const RoomReportDocumentSchema = z.object({
  schema_version: z.number().int().default(REPORT_SCHEMA_VERSION),
  nome: z.string().trim(),
  idade: z.union([z.string().trim(), z.number()]),
  revelacoes: z.array(roomRevealSchema).min(1),
});

export type RoomReportDocument = z.infer<typeof RoomReportDocumentSchema>;

export function parseReportDocument(value: unknown): ReportDocument {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return ReportDocumentSchema.parse(parsed);
}

export function parseRoomReportDocument(value: unknown): RoomReportDocument {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return RoomReportDocumentSchema.parse(parsed);
}
