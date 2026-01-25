/**
 * Módulo de Cálculo de Balanceamento da Grade Curricular
 * 
 * Implementa o modelo estatístico para avaliar:
 * - Dificuldade média ponderada da grade (DMP)
 * - Índice de Adequação de Dificuldade da Grade (IADG)
 * - Índice de Balanceamento da Grade (IBG)
 */

import indicadoresData from './disciplinas-indicadores.json';
import { curriculumData } from './curriculum';

// Tipos
interface DisciplinaIndicadores {
  codigo_disciplina: string;
  disciplina: string;
  carga_horaria: number;
  indicadores: {
    taxa_reprovacao: number;
    indice_dificuldade: number;
  };
}

interface CAPDResult {
  codigo: string;
  nome: string;
  creditos: number;
  idd: number;
  capd: number;
}

export interface GradeBalanceResult {
  capdPorDisciplina: CAPDResult[];
  capdTotal: number;
  dmp: number;
  iadg: number;
  ibg: number;
  classificacaoIADG: string;
  classificacaoIBG: string;
  interpretacao: string;
}

// Constantes do modelo
const D_MIN = 0.35;
const D_MAX = 0.60;
const D_IDEAL = (D_MIN + D_MAX) / 2;

/**
 * Obtém indicadores de uma disciplina pelo código
 */
function getIndicadoresPorCodigo(codigo: string): DisciplinaIndicadores | null {
  const disciplinas = indicadoresData.endpoints['/disciplinas'] as DisciplinaIndicadores[];
  return disciplinas.find(d => d.codigo_disciplina === codigo) || null;
}

/**
 * Converte carga horária em créditos (60h = 4 créditos)
 */
function cargaHorariaParaCreditos(cargaHoraria: number): number {
  return Math.round((cargaHoraria / 15) * 100) / 100;
}

/**
 * Calcula a Carga Acadêmica Ponderada por Dificuldade (CAPD)
 */
function calcularCAPD(disciplinas: string[]): CAPDResult[] {
  return disciplinas
    .map(codigo => {
      const indicadores = getIndicadoresPorCodigo(codigo);
      if (!indicadores) return null;

      const creditos = cargaHorariaParaCreditos(indicadores.carga_horaria);
      const idd = indicadores.indicadores.indice_dificuldade;
      const capd = creditos * idd;

      return {
        codigo: indicadores.codigo_disciplina,
        nome: indicadores.disciplina,
        creditos,
        idd,
        capd
      };
    })
    .filter((d): d is CAPDResult => d !== null);
}

/**
 * Calcula a Dificuldade Média Ponderada (DMP)
 */
function calcularDMP(capdResults: CAPDResult[]): number {
  const somaCreditos = capdResults.reduce((acc, d) => acc + d.creditos, 0);
  const somaPonderada = capdResults.reduce((acc, d) => acc + (d.creditos * d.idd), 0);
  
  return somaCreditos > 0 ? somaPonderada / somaCreditos : 0;
}

/**
 * Calcula o Índice de Adequação de Dificuldade da Grade (IADG)
 */
function calcularIADG(dmp: number): number {
  const deltaD = Math.abs(dmp - D_IDEAL);
  const iadg = 1 - Math.min(1, deltaD / (D_MAX - D_IDEAL));
  return Math.round(iadg * 10000) / 10000;
}

/**
 * Calcula o Índice de Balanceamento da Grade (IBG)
 */
function calcularIBG(capdResults: CAPDResult[]): number {
  const n = capdResults.length;
  if (n === 0) return 0;

  const capdMedia = capdResults.reduce((acc, d) => acc + d.capd, 0) / n;
  const variancia = capdResults.reduce((acc, d) => 
    acc + Math.pow(d.capd - capdMedia, 2), 0
  ) / n;
  
  const desvioPadrao = Math.sqrt(variancia);
  const ibg = 1 - Math.min(1, desvioPadrao / capdMedia);
  
  return Math.round(ibg * 10000) / 10000;
}

/**
 * Classifica IADG
 */
function classificarIADG(iadg: number): string {
  if (iadg >= 0.80) return 'Dificuldade ideal';
  if (iadg >= 0.60) return 'Levemente fora do ideal';
  if (iadg >= 0.40) return 'Inadequada';
  if (iadg >= 0.20) return 'Muito inadequada';
  return 'Crítica';
}

/**
 * Classifica IBG
 */
function classificarIBG(ibg: number): string {
  if (ibg >= 0.80) return 'Muito bem balanceada';
  if (ibg >= 0.60) return 'Balanceada';
  if (ibg >= 0.40) return 'Moderadamente desbalanceada';
  if (ibg >= 0.20) return 'Desbalanceada';
  return 'Criticamente desbalanceada';
}

/**
 * Gera interpretação integrada
 */
function interpretarBalanceamento(iadg: number, ibg: number, dmp: number): string {
  const classeIADG = classificarIADG(iadg);
  const classeIBG = classificarIBG(ibg);
  
  // Grade ideal
  if (iadg >= 0.80 && ibg >= 0.80) {
    return 'Grade ideal: dificuldade adequada e bem distribuída entre as disciplinas.';
  }
  
  // Problemas estruturais
  if (ibg < 0.40) {
    return `Grade com sérios problemas de balanceamento (${classeIBG}). A carga de dificuldade está concentrada em poucas disciplinas, criando gargalos no fluxo acadêmico.`;
  }
  
  // Problemas de dificuldade
  if (dmp > D_MAX) {
    if (iadg < 0.40) {
      return `Grade excessivamente difícil (DMP: ${(dmp * 100).toFixed(1)}%). Risco elevado de evasão e retenção. ${classeIBG}.`;
    }
    return `Grade com dificuldade acima do ideal (${classeIADG}). ${classeIBG}.`;
  }
  
  if (dmp < D_MIN) {
    if (iadg < 0.40) {
      return `Grade excessivamente fácil (DMP: ${(dmp * 100).toFixed(1)}%). Pode não preparar adequadamente os estudantes. ${classeIBG}.`;
    }
    return `Grade com dificuldade abaixo do ideal (${classeIADG}). ${classeIBG}.`;
  }
  
  // Casos moderados
  if (iadg >= 0.60 && ibg >= 0.60) {
    return `Grade com desempenho satisfatório. ${classeIADG}, ${classeIBG}.`;
  }
  
  return `Grade com adequação ${classeIADG.toLowerCase()} e ${classeIBG.toLowerCase()}. Recomenda-se revisão da distribuição das disciplinas.`;
}

/**
 * Calcula todos os indicadores de balanceamento da grade
 */
export function calcularBalanceamentoGrade(disciplinasSelecionadas?: string[]): GradeBalanceResult {
  // Se não houver seleção, usa todas as disciplinas obrigatórias do currículo
  const disciplinas = disciplinasSelecionadas || 
    curriculumData
      .filter(d => d.obrigatoria)
      .map(d => d.cod);
  
  const capdPorDisciplina = calcularCAPD(disciplinas);
  const capdTotal = capdPorDisciplina.reduce((acc, d) => acc + d.capd, 0);
  const dmp = calcularDMP(capdPorDisciplina);
  const iadg = calcularIADG(dmp);
  const ibg = calcularIBG(capdPorDisciplina);
  
  return {
    capdPorDisciplina,
    capdTotal: Math.round(capdTotal * 10000) / 10000,
    dmp: Math.round(dmp * 10000) / 10000,
    iadg,
    ibg,
    classificacaoIADG: classificarIADG(iadg),
    classificacaoIBG: classificarIBG(ibg),
    interpretacao: interpretarBalanceamento(iadg, ibg, dmp)
  };
}

/**
 * Obtém cor para visualização baseada no valor
 */
export function getCorPorValor(valor: number, tipo: 'reprovacao' | 'dificuldade'): string {
  if (tipo === 'reprovacao') {
    if (valor >= 0.40) return '#dc2626'; // red-600
    if (valor >= 0.25) return '#ea580c'; // orange-600
    if (valor >= 0.15) return '#f59e0b'; // amber-500
    return '#22c55e'; // green-500
  }
  
  // tipo === 'dificuldade' (baseado em IADG)
  if (valor >= 0.80) return '#22c55e'; // green-500 - Ideal
  if (valor >= 0.60) return '#84cc16'; // lime-500 - Levemente fora
  if (valor >= 0.40) return '#f59e0b'; // amber-500 - Inadequada
  if (valor >= 0.20) return '#ea580c'; // orange-600 - Muito inadequada
  return '#dc2626'; // red-600 - Crítica
}
