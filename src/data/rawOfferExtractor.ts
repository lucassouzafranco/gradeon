import { RawOffer, Discipline } from '../types/types';
import { courseData as legacyCourseData } from './courseData';

export function extractRawOffers(
  legacyData: Record<string, Discipline[]>
): RawOffer[] {
  const offers: RawOffer[] = [];

  for (const periodKey of Object.keys(legacyData)) {
    const disciplines = legacyData[periodKey];
    
    for (const disc of disciplines) {
      const rawOffer: RawOffer = {
        cod: disc.CodDisciplina,
        nome: disc.NomeDisciplina,
        tipo: disc.Tipo as 'P' | 'T',
        turma: disc.Turma,
        horarios: disc.Horarios,
        sala: disc.Sala,
        cargaSemanal: disc.CargaSemanal,
        cargaTotal: disc.CargaTotal,
        oferecida: disc.Oferecida as 'S' | 'N'
      };

      offers.push(rawOffer);
    }
  }

  return offers;
}

export function getCurrentRawOffers(): RawOffer[] {
  return extractRawOffers(legacyCourseData);
}
