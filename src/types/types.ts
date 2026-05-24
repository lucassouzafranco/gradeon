export interface Discipline {
  CodDisciplina: string;
  Tipo: string;
  Turma: string;
  Horarios: string;
  Sala: string;
  Periodo: number | string;
  NomeDisciplina: string;
  CargaSemanal: string;
  CargaTotal: number;
  Dependencias: string;
  Oferecida: string;
  CodDisc: string;
  Depen: string;
  reprovaPercentual?: number | null;
  // Novos campos do catálogo
  Creditos?: number;
  Prerequisitos?: string[];
  Dependentes?: string[];
  TurmasDisponiveis?: {
    teoricas: ClassSection[];
    praticas: ClassSection[];
  };
}

export interface ClassSection {
  turma: string;
  horarios: string[];
  salas: string[];
  professor: string;
}

// Tipos internos para processamento de dados
export interface RawOffer {
  cod: string;
  nome: string;
  tipo: 'P' | 'T';
  turma: string;
  horarios: string;
  sala: string;
  // Fields below may be null if not available from data source
  cargaSemanal: string | null;
  cargaTotal: number | null;
  oferecida: 'S' | 'N' | null;
}

export interface CurriculumDiscipline {
  cod: string;
  periodo: number;
  prerequisitos: string[];
  obrigatoria: boolean;
}

export interface NormalizedDiscipline {
  cod: string;
  nome: string;
  periodo: number;
  prerequisitos: string[];
  ofertas: RawOffer[];
}
