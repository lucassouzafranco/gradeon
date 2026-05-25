/**
 * scraper.ts
 * 
 * Scrapes course offering data from UFV's registration website.
 * 
 * DATA SOURCE: https://www.dti.ufv.br/horario_crp/horario.asp
 * 
 * WHAT IS SCRAPED:
 * - cod: Discipline code (e.g., "SIN110")
 * - nome: Discipline name
 * - tipo: Type (T=Theoretical, P=Practical)
 * - turma: Class number/section
 * - horarios: Schedule (format: "2=14:00-16:00 3=16:00-18:00")
 * - sala: Classroom
 * 
 * WHAT IS NOT AVAILABLE (returns null):
 * - cargaSemanal: Weekly workload - NOT in registration HTML
 * - cargaTotal: Total workload - NOT in registration HTML  
 * - oferecida: Offered status - NOT in registration HTML
 * - periodo: Period/semester - comes from curriculum, not here
 * 
 * These fields are set to null to indicate absence of data.
 * To get real values, use catalog scraper and merge the data.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { RawOffer } from '../types/types';
import scrapedData from './scrapedData.json';

interface ScraperConfig {
  ano: number;
  semestre: 1 | 2;
  depto: string;
}

const BASE_URL = 'https://www.dti.ufv.br/horario_crp/horario.asp';

// Exported for testing
export function parseHorario(horarioStr: string): string {
  // Handle empty or "a combinar" cases
  if (!horarioStr || horarioStr.trim() === '' || horarioStr.trim().toLowerCase() === 'a combinar') {
    return '';
  }
  
  // Match patterns like:
  // "2=16-18" (compact time)
  // "2=16-185=14-16" (multiple days, compact)
  // "2=21:00-22:40" (full time format)
  // "2=21:00-22:405=19:00-20:40" (multiple days, full format)
  const matches = horarioStr.match(/(\d+)=(\d{1,2}:\d{2}-\d{2}:\d{2}|\d{1,2}-\d{2})/g);
  
  if (!matches || matches.length === 0) {
    // If no valid pattern found, return empty (don't guess)
    return '';
  }
  
  // Normalize each day=time part
  return matches.map(match => {
    const [dia, hora] = match.split('=');
    
    // If hora already has colons, keep it
    if (hora.includes(':')) {
      return `${dia}=${hora}`;
    }
    
    // Otherwise, convert "16-18" to "16:00-18:00"
    const horaExpandida = hora.replace(/(\d{1,2})-(\d{2})/, '$1:00-$2:00');
    return `${dia}=${horaExpandida}`;
  }).join(' ');
}

function parseHorarios(html: string): RawOffer[] {
  const $ = cheerio.load(html);
  const ofertas: RawOffer[] = [];
  
  // The UFV site has multiple tables. We need the one with proper row structure.
  // Table 3 has each discipline as a separate row with 11 cells.
  const tables = $('table');
  let dataTable: any = null;
  
  // Find the table where rows have exactly 11 cells (proper structure)
  tables.each((_idx: number, table: any) => {
    const rows = $(table).find('tr');
    if (rows.length > 10) {
      const sampleRow = $(rows[1]).find('td');
      if (sampleRow.length === 11) {
        dataTable = $(table);
        return false; // break
      }
    }
  });
  
  if (!dataTable) {
    console.warn('Could not find data table with expected structure');
    return ofertas;
  }
  
  const rows = dataTable.find('tr');
  
  rows.each((_rowIndex: number, row: any) => {
    const cells = $(row).find('td');
    
    // Skip rows that don't have exactly 11 cells
    if (cells.length !== 11) return;
    
    const codigo = $(cells[0]).text().trim();
    
    // Skip header row
    if (codigo === 'Cod' || codigo.includes('Cod')) return;
    
    // Validate this is a discipline code (e.g., "SIN 110")
    if (!codigo || !/^[A-Z]{3}\s*\d{3}/.test(codigo)) return;
    
    const disciplina = $(cells[1]).text().trim();
    const tipo = $(cells[2]).text().trim();
    const turma = $(cells[3]).text().trim();
    const horario = $(cells[4]).text().trim();
    const sala = $(cells[5]).text().trim();
    
    ofertas.push({
      cod: codigo.replace(/\s+/g, ''),
      nome: disciplina,
      tipo: tipo as 'T' | 'P',
      turma: turma || '1',
      horarios: parseHorario(horario),
      sala,
      // Fields below are NOT available in registration HTML
      // Setting to null to indicate absence of data (not inventing defaults)
      // Real values should come from catalog scraper merge
      cargaSemanal: null,
      cargaTotal: null,
      oferecida: null
    });
  });
  
  return ofertas;
}

export async function scrapeHorarios(config: ScraperConfig): Promise<RawOffer[]> {
  const url = `${BASE_URL}?ano=${config.ano}&semestre=${config.semestre}&depto=${config.depto}`;
  
  console.log('[SCRAPING] ════════════════════════════════════');
  console.log('[SCRAPING] started: horários (operational data)');
  console.log(`[SCRAPING] URL: ${url}`);
  console.log(`[SCRAPING] params: ano=${config.ano}, semestre=${config.semestre}, depto=${config.depto}`);
  const startTime = Date.now();
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'text'
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    const ofertas = parseHorarios(response.data);
    const duration = Date.now() - startTime;
    
    console.log(`[SCRAPING] ✅ found: ${ofertas.length} course offers`);
    console.log(`[SCRAPING] ✅ finished successfully in ${duration}ms`);
    console.log('[SCRAPING] ════════════════════════════════════\n');
    
    return ofertas;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[SCRAPING] ❌ ERROR after ${duration}ms:`, error);
    console.log('[SCRAPING] ════════════════════════════════════\n');
    throw error;
  }
}

// Extrair departamentos únicos dinamicamente com base no catálogo de disciplinas cadastrado
export function getUniqueDepartments(): string[] {
  const deptos = new Set<string>();
  
  if (scrapedData && scrapedData.courseData) {
    Object.values(scrapedData.courseData).forEach((disciplines: any) => {
      if (Array.isArray(disciplines)) {
        disciplines.forEach((disc: any) => {
          if (disc && disc.CodDisciplina) {
            const match = disc.CodDisciplina.match(/^([A-Z]+)/);
            if (match) {
              deptos.add(match[1]);
            }
          }
        });
      }
    });
  }
  
  // Garantir 'SIN' como fallback seguro caso os dados estejam corrompidos ou vazios
  if (deptos.size === 0) {
    deptos.add('SIN');
  }
  
  return Array.from(deptos);
}

export async function getSINOffers(ano: number = 2025, semestre: 1 | 2 = 2): Promise<RawOffer[]> {
  console.log('[SCRAPING] Initiating UFV registration site scraping for SIN and external departments...');
  const deptos = getUniqueDepartments();
  console.log(`[SCRAPING] Dynamically detected departments from course data: ${deptos.join(', ')}`);
  
  const allResults = await Promise.allSettled(
    deptos.map(depto => scrapeHorarios({ ano, semestre, depto }))
  );
  
  const combinedOffers: RawOffer[] = [];
  allResults.forEach((res, idx) => {
    if (res.status === 'fulfilled') {
      combinedOffers.push(...res.value);
    } else {
      console.warn(`[SCRAPING] Warning: Failed to scrape department ${deptos[idx]}:`, res.reason);
    }
  });
  
  return combinedOffers;
}
