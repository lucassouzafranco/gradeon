import { Discipline } from '../types/types';
import indice from './cursos/index.json';

/** Resumo de um curso, vindo de cursos/index.json (gerado por scripts/prebuild-scrape.mjs). */
export interface CursoInfo {
  id: string;
  nome: string;
  periodos: number;
  totalDisciplinas: number;
  totalOptativasOfertadas: number;
}

export interface CursoMetadata {
  generatedAt: string;
  ano: number;
  periodos: number;
  totalDisciplinas: number;
  totalOptativas: number;
  totalOptativasOfertadas: number;
  medianaGlobalReprovacao?: number;
}

/** Dados completos de um curso: matriz por período, optativas e metadados. */
export interface CursoDados {
  metadata: CursoMetadata;
  courseData: Record<string, Discipline[]>;
  optativas: Discipline[];
}

/** Curso aberto por padrão e o único com balanceamento calibrado até agora. */
export const CURSO_PADRAO = 'SIP';

export const CURSOS: CursoInfo[] = indice.cursos;

/**
 * Um import dinâmico por curso: cada JSON vira um arquivo separado no build
 * e só é baixado quando o curso é escolhido, em vez de os 10 entrarem no carregamento inicial.
 */
const carregadores: Record<string, () => Promise<{ default: unknown }>> = {
  SIP: () => import('./cursos/SIP.json'),
  ADP: () => import('./cursos/ADP.json'),
  AGP: () => import('./cursos/AGP.json'),
  CBP: () => import('./cursos/CBP.json'),
  CTP: () => import('./cursos/CTP.json'),
  CAP: () => import('./cursos/CAP.json'),
  ECP: () => import('./cursos/ECP.json'),
  EPP: () => import('./cursos/EPP.json'),
  NTP: () => import('./cursos/NTP.json'),
  QMP: () => import('./cursos/QMP.json'),
};

function isCursoDados(valor: unknown): valor is CursoDados {
  if (typeof valor !== 'object' || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return typeof v.metadata === 'object' && v.metadata !== null
    && typeof v.courseData === 'object' && v.courseData !== null
    && Array.isArray(v.optativas);
}

export function buscarCurso(id: string): CursoInfo | undefined {
  return CURSOS.find(c => c.id === id);
}

export async function carregarCurso(id: string): Promise<CursoDados> {
  const carregar = carregadores[id];
  if (!carregar) throw new Error(`Curso desconhecido: ${id}`);
  const modulo = await carregar();
  if (!isCursoDados(modulo.default)) throw new Error(`Dados inválidos para o curso ${id}`);
  return modulo.default;
}
