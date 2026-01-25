import type { Discipline, ClassSection } from '../types/types';

interface ScrapedDataShape {
  metadata?: {
    generatedAt?: string;
    totalDisciplinas?: number;
  };
  courseData?: Record<string, Discipline[]>;
}

const hasString = (value: unknown): value is string => typeof value === 'string';
const hasNumber = (value: unknown): value is number => typeof value === 'number' && !Number.isNaN(value);

const isClassSection = (value: unknown): value is ClassSection => {
  if (!value || typeof value !== 'object') return false;
  const section = value as ClassSection;
  return (
    hasString(section.turma) &&
    Array.isArray(section.horarios) &&
    Array.isArray(section.salas)
  );
};

const isDiscipline = (value: unknown): value is Discipline => {
  if (!value || typeof value !== 'object') return false;
  const disc = value as Discipline;

  return (
    hasString(disc.CodDisciplina) &&
    hasString(disc.NomeDisciplina) &&
    (hasString(disc.Periodo) || hasNumber(disc.Periodo as number)) &&
    hasString(disc.Tipo) &&
    hasString(disc.Turma)
  );
};

export function isValidScrapedData(data: unknown): data is Required<ScrapedDataShape> {
  if (!data || typeof data !== 'object') return false;
  const shape = data as ScrapedDataShape;

  if (!shape.courseData || typeof shape.courseData !== 'object') return false;

  for (const key of Object.keys(shape.courseData)) {
    const list = shape.courseData[key];
    if (!Array.isArray(list)) return false;

    for (const item of list) {
      if (!isDiscipline(item)) return false;

      if (item.TurmasDisponiveis) {
        const { teoricas, praticas } = item.TurmasDisponiveis;
        if (!Array.isArray(teoricas) || !Array.isArray(praticas)) return false;
        if (!teoricas.every(isClassSection) || !praticas.every(isClassSection)) return false;
      }
    }
  }

  return true;
}
