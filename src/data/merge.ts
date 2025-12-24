import { RawOffer, CurriculumDiscipline, NormalizedDiscipline } from '../types/types';

export function mergeOffersWithCurriculum(
  offers: RawOffer[],
  curriculum: CurriculumDiscipline[]
): NormalizedDiscipline[] {
  const offersByCode = groupOffersByCode(offers);
  
  const curriculumMap = new Map<string, CurriculumDiscipline>();
  for (const curr of curriculum) {
    curriculumMap.set(curr.cod, curr);
  }

  const normalized: NormalizedDiscipline[] = [];

  for (const [cod, offersForDiscipline] of offersByCode.entries()) {
    const currInfo = curriculumMap.get(cod);

    if (!currInfo) {
      console.warn(`No curriculum info found for discipline: ${cod}`);
      continue;
    }

    if (offersForDiscipline.length === 0) {
      console.warn(`No offers found for discipline: ${cod}`);
    }

    const nome = offersForDiscipline[0]?.nome || cod;

    const normalizedDisc: NormalizedDiscipline = {
      cod: cod,
      nome: nome,
      periodo: currInfo.periodo,
      prerequisitos: currInfo.prerequisitos,
      ofertas: offersForDiscipline
    };

    normalized.push(normalizedDisc);
  }

  for (const curr of curriculum) {
    if (!offersByCode.has(curr.cod)) {
      console.warn(`Discipline ${curr.cod} in curriculum but has no offers`);
      
      const normalizedDisc: NormalizedDiscipline = {
        cod: curr.cod,
        nome: curr.cod,
        periodo: curr.periodo,
        prerequisitos: curr.prerequisitos,
        ofertas: []
      };

      normalized.push(normalizedDisc);
    }
  }

  return normalized;
}

function groupOffersByCode(offers: RawOffer[]): Map<string, RawOffer[]> {
  const grouped = new Map<string, RawOffer[]>();

  for (const offer of offers) {
    const existing = grouped.get(offer.cod) || [];
    existing.push(offer);
    grouped.set(offer.cod, existing);
  }

  return grouped;
}

export function validateNormalizedData(data: NormalizedDiscipline[]): boolean {
  if (!Array.isArray(data)) {
    console.error('Validation failed: data is not an array');
    return false;
  }

  for (const disc of data) {
    if (!disc.cod || !disc.nome) {
      console.error('Validation failed: discipline missing cod or nome');
      return false;
    }

    if (typeof disc.periodo !== 'number') {
      console.error(`Validation failed: discipline ${disc.cod} has invalid periodo`);
      return false;
    }

    if (!Array.isArray(disc.prerequisitos)) {
      console.error(`Validation failed: discipline ${disc.cod} prerequisitos not array`);
      return false;
    }

    if (!Array.isArray(disc.ofertas)) {
      console.error(`Validation failed: discipline ${disc.cod} ofertas not array`);
      return false;
    }
  }

  return true;
}
