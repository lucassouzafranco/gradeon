import { Discipline } from '../types/types';
import indice from './cursos/index.json';

export interface CursoInfo { id: string; nome: string; periodos: number; totalDisciplinas: number; totalOptativasOfertadas: number; anoCatalogo: number }
export interface CursoMetadata {
  generatedAt: string; ano: number; anoCatalogo: number;
  curso: { id: string; nome: string };
  horarios: { ano: number; semestres: number[] };
  periodos: number; totalDisciplinas: number; totalOptativas: number; totalOptativasOfertadas: number;
  medianaGlobalReprovacao?: number;
}
export interface CursoDados { metadata: CursoMetadata; courseData: Record<string, Discipline[]>; optativas: Discipline[] }
export const CURSO_PADRAO = 'SIP';
export const CATALOGOS: CursoInfo[] = indice.cursos;
export const CURSOS = CATALOGOS.filter((c, i, todos) => todos.findIndex(x => x.id === c.id) === i);
const carregadores = import.meta.glob('./cursos/*/*.json');
export function buscarCurso(id: string, ano?: number): CursoInfo | undefined {
  return CATALOGOS.find(c => c.id === id && (ano === undefined || c.anoCatalogo === ano));
}
export function anosDoCurso(id: string): number[] { return CATALOGOS.filter(c => c.id === id).map(c => c.anoCatalogo).sort((a,b) => b-a); }
function objeto(v: unknown): v is Record<string, unknown> { return typeof v === 'object' && v !== null; }
function strings(v: unknown): v is string[] { return Array.isArray(v) && v.every(x => typeof x === 'string'); }
function disciplina(v: unknown): v is Discipline {
  if (!objeto(v)) return false;
  if (!['CodDisciplina','Tipo','Turma','Horarios','Sala','NomeDisciplina','CargaSemanal','Dependencias','Oferecida','CodDisc','Depen'].every(k => typeof v[k] === 'string')) return false;
  if (!(typeof v.Periodo === 'number' || typeof v.Periodo === 'string') || typeof v.CargaTotal !== 'number') return false;
  if (v.Prerequisitos !== undefined && !strings(v.Prerequisitos)) return false;
  if (v.Dependentes !== undefined && !strings(v.Dependentes)) return false;
  if (v.TurmasDisponiveis !== undefined) {
    if (!objeto(v.TurmasDisponiveis)) return false;
    for (const k of ['teoricas','praticas']) {
      const lista = v.TurmasDisponiveis[k];
      if (!Array.isArray(lista) || !lista.every(t => objeto(t) && typeof t.turma === 'string' && strings(t.horarios) && strings(t.salas) && typeof t.professor === 'string')) return false;
    }
  }
  return (v.Creditos === undefined || typeof v.Creditos === 'number') && (v.reprovaPercentual == null || typeof v.reprovaPercentual === 'number');
}
function valido(v: unknown, id: string, ano: number): v is CursoDados {
  if (!objeto(v) || !objeto(v.metadata) || !objeto(v.courseData)) return false;
  const m = v.metadata;
  return objeto(m.curso) && m.curso.id === id && m.anoCatalogo === ano
    && typeof m.generatedAt === 'string'
    && ['periodos','totalDisciplinas','totalOptativas','totalOptativasOfertadas'].every(k => typeof m[k] === 'number')
    && objeto(m.horarios) && typeof m.horarios.ano === 'number'
    && Array.isArray(m.horarios.semestres) && m.horarios.semestres.includes(1) && m.horarios.semestres.includes(2)
    && Object.values(v.courseData).every(l => Array.isArray(l) && l.every(disciplina))
    && Array.isArray(v.optativas) && v.optativas.every(disciplina);
}
export async function carregarCurso(id: string, ano: number): Promise<CursoDados> {
  const carregar = carregadores[`./cursos/${ano}/${id}.json`];
  if (!buscarCurso(id, ano) || !carregar) throw new Error('Catálogo indisponível.');
  const modulo: unknown = await carregar();
  if (!objeto(modulo) || !valido(modulo.default, id, ano)) throw new Error('Dados do catálogo inválidos.');
  return modulo.default;
}
