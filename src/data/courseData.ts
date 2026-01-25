import { Discipline } from '../types/types';
import scrapedData from './scrapedData.json';

// Usar dados do scraper diretamente - contém Dependentes, Prerequisitos, Creditos, etc.
export const courseData: Record<string, Discipline[]> = scrapedData.courseData as Record<string, Discipline[]>;
