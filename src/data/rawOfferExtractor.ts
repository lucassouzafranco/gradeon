import { RawOffer, Discipline } from '../types/types';
import scrapedData from './scrapedData.json';
import { getSINOffers } from './scraper';

export function extractRawOffers(): RawOffer[] {
  const offers: RawOffer[] = [];
  const data = scrapedData.courseData as Record<string, Discipline[]>;

  for (const periodKey of Object.keys(data)) {
    const disciplines = data[periodKey];
    
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
  return extractRawOffers();
}

export async function getScrapedOffers(): Promise<RawOffer[]> {
  try {
    const scrapedData = await getSINOffers();
    return scrapedData;
  } catch (error) {
    console.warn('Falha ao fazer scraping, usando dados estáticos:', error);
    return getCurrentRawOffers();
  }
}
