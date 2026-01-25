import { Discipline, NormalizedDiscipline } from '../types/types';
import { logger } from '../utils/logger';

export function toLegacyCourseData(
  normalized: NormalizedDiscipline[]
): Record<string, Discipline[]> {
  const result: Record<string, Discipline[]> = {};

  for (const norm of normalized) {
    const periodKey = String(norm.periodo);
    
    if (!result[periodKey]) {
      result[periodKey] = [];
    }

    for (const offer of norm.ofertas) {
      const codDisc = offer.cod.replace(/\s/g, '');
      const depen = norm.prerequisitos
        .map(prereq => prereq.replace(/\s/g, ''))
        .join('|');

      const legacyDiscipline: Discipline = {
        CodDisciplina: offer.cod,
        Tipo: offer.tipo,
        Turma: offer.turma,
        Horarios: offer.horarios,
        Sala: offer.sala,
        Periodo: norm.periodo,
        NomeDisciplina: offer.nome,
        // Use defaults for fields that may be null (from registration scraper)
        // Frontend expects non-null values, so we provide safe defaults
        CargaSemanal: offer.cargaSemanal ?? '4(4-0)',  // Common pattern
        CargaTotal: offer.cargaTotal ?? 60,            // Standard workload
        Dependencias: norm.prerequisitos.join('|'),    // With spaces
        Oferecida: offer.oferecida ?? 'S',             // If listed, assume offered
        CodDisc: codDisc,
        Depen: depen
      };

      result[periodKey].push(legacyDiscipline);
    }
  }

  return result;
}

export function validateLegacyFormat(data: Record<string, Discipline[]>): boolean {
  if (typeof data !== 'object' || data === null) {
    logger.warn('Validation failed: data is not an object');
    return false;
  }

  for (const key of Object.keys(data)) {
    if (!/^\d+$/.test(key)) {
      logger.warn(`Validation failed: key "${key}" is not a numeric string`);
      return false;
    }

    const disciplines = data[key];
    if (!Array.isArray(disciplines)) {
      logger.warn(`Validation failed: value for key "${key}" is not an array`);
      return false;
    }

    for (const disc of disciplines) {
      const requiredFields = [
        'CodDisciplina', 'Tipo', 'Turma', 'Horarios', 'Sala',
        'Periodo', 'NomeDisciplina', 'CargaSemanal', 'CargaTotal',
        'Dependencias', 'Oferecida', 'CodDisc', 'Depen'
      ];

      for (const field of requiredFields) {
        if (!(field in disc)) {
          logger.warn(`Validation failed: missing field "${field}" in discipline`);
          return false;
        }
      }
    }
  }

  return true;
}
