import { Discipline } from '../types/types';
import scrapedData from './scrapedData.json';

// Usar dados do scraper diretamente - contém Dependentes, Prerequisitos, Creditos, etc.
export const courseData: Record<string, Discipline[]> = scrapedData.courseData as Record<string, Discipline[]>;

console.log('✅ [courseData] Dados do scraper carregados com sucesso');
console.log('[courseData] Períodos:', Object.keys(courseData).length);
console.log('[courseData] Total de disciplinas:', Object.values(courseData).reduce((sum, arr) => sum + arr.length, 0));
console.log('[courseData] Campos disponíveis:', Object.keys(courseData['1'][0]));
