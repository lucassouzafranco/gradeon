/**
 * catalogScraper.ts
 * 
 * Scrapes discipline metadata from UFV's academic catalog.
 * 
 * DATA SOURCE: https://www.catalogo.ufv.br/interno.php
 * 
 * WHAT IS SCRAPED:
 * - cod: Discipline code ✅
 * - nome: Discipline name ✅
 * - periodo: Academic period (1-8) ✅
 * - cargaTotal: Total workload hours ✅
 * - cargaSemanal: Weekly workload pattern (e.g., "4(4-0)") ✅
 * - dependentes: Disciplines that depend on this one ✅
 * 
 * WHAT IS NOT AVAILABLE:
 * - prerequisitos: Not present in HTML (may be in PDF only)
 * - corequisitos: Not present in HTML (may be in PDF only)
 * 
 * NOTE: prerequisitos and corequisitos could potentially be derived
 * by reversing the dependentes relationships, but this is not yet implemented.
 * 
 * This scraper provides discipline-level metadata.
 * It does NOT provide offering-level data (that comes from registration scraper).
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface CatalogDiscipline {
  cod: string;
  nome: string;
  periodo: number;
  cargaTotal: number | null;
  cargaSemanal: string | null;
  prerequisitos: string[];
  corequisitos: string[];
  dependentes: string[];
}

interface CatalogConfig {
  ano: number;
  curso: string;
  campus: string;
  periodo: number;
}

const BASE_URL = 'https://www.catalogo.ufv.br/interno.php';

// Exported for testing
export function normalizeCodigo(cod: string): string {
  return cod.replace(/\s+/g, ' ').trim().toUpperCase();
}

async function fetchDisciplineDetail(cod: string): Promise<{
  cargaTotal: number | null,
  cargaSemanal: string | null,
  prerequisitos: string[],
  corequisitos: string[],
  dependentes: string[]
}> {
  // Must include all params, not just disciplina param
  const url = `${BASE_URL}?ano=2025&curso=SIP&campus=crp&periodo=1&complemento=*&disciplina=${encodeURIComponent(cod)}`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'arraybuffer'
    });

    if (response.status !== 200) {
      return { cargaTotal: null, cargaSemanal: null, prerequisitos: [], corequisitos: [], dependentes: [] };
    }

    // O catálogo pode vir em ISO-8859-1/Windows-1252.
    // Decodificar como UTF-8 quebra acentos/ç/til.
    const html = Buffer.from(response.data).toString('latin1');
    const $ = cheerio.load(html);
    
    // Extract total hours (e.g., "90 horas")
    let cargaTotal: number | null = null;
    const horasText = $('#disciplina-horas').text().trim();
    const horasMatch = horasText.match(/(\d+)\s*horas/i);
    if (horasMatch) {
      cargaTotal = parseInt(horasMatch[1], 10);
    }
    
    // Extract weekly workload pattern (e.g., "6(4+2)")
    let cargaSemanal: string | null = null;
    const chText = $('#disciplina-ch').text().trim();
    if (chText && chText.length > 0) {
      cargaSemanal = chText;
    }
    
    // NOTE: prerequisitos and corequisitos are NOT available in HTML
    // The #disciplina-relacionadas-ementa div exists but is always empty
    // This was verified through inspection - the data simply isn't present
    // It may be available only in PDF or needs reverse engineering from dependentes
    const prerequisitos: string[] = [];
    const corequisitos: string[] = [];
    
    // Extract dependentes (disciplines that depend on this one)
    const dependentes: string[] = [];
    $('#disciplinas-dependentes ul.disciplinas-itens li a').each((_idx: number, link: any) => {
      const linkText = $(link).text().trim();
      const codeMatch = linkText.match(/([A-Z]{3}\s*\d{3})/);
      if (codeMatch) {
        dependentes.push(normalizeCodigo(codeMatch[1]));
      }
    });
    
    return { cargaTotal, cargaSemanal, prerequisitos, corequisitos, dependentes };
  } catch (error) {
    console.warn(`Erro ao buscar detalhes de ${cod}:`, error);
    return { cargaTotal: null, cargaSemanal: null, prerequisitos: [], corequisitos: [], dependentes: [] };
  }
}

function parseCatalogPage(html: string, periodo: number): CatalogDiscipline[] {
  const $ = cheerio.load(html);
  const disciplinas: CatalogDiscipline[] = [];
  
  // Find all discipline blocks in the period listing
  $('#disciplinas .bloco a').each((_idx: number, link: any) => {
    const linkText = $(link).text().trim();
    
    // Extract code from link text (format: "SIN 110Programação")
    const codeMatch = linkText.match(/^([A-Z]{3}\s*\d{3})/);
    if (!codeMatch) return;
    
    const rawCode = codeMatch[1];
    const nome = $(link).find('span').text().trim();
    
    disciplinas.push({
      cod: normalizeCodigo(rawCode),
      nome: nome,
      periodo: periodo,
      cargaTotal: null, // Will be fetched in enrichment phase
      cargaSemanal: null, // Will be fetched in enrichment phase
      prerequisitos: [],
      corequisitos: [],
      dependentes: []
    });
  });
  
  return disciplinas;
}

async function enrichWithDetails(disciplinas: CatalogDiscipline[]): Promise<CatalogDiscipline[]> {
  // Fetch detail pages to get cargaTotal, cargaSemanal, and relationships
  for (const disciplina of disciplinas) {
    const details = await fetchDisciplineDetail(disciplina.cod);
    disciplina.cargaTotal = details.cargaTotal;
    disciplina.cargaSemanal = details.cargaSemanal;
    disciplina.prerequisitos = details.prerequisitos;
    disciplina.corequisitos = details.corequisitos;
    disciplina.dependentes = details.dependentes;
  }
  
  return disciplinas;
}

export async function scrapePeriodo(config: CatalogConfig, includeDetails: boolean = false): Promise<CatalogDiscipline[]> {
  // Note: catalog uses 'SIP' as course code, not 'SIN'
  const cursoCode = config.curso === 'SIN' ? 'SIP' : config.curso;
  const url = `${BASE_URL}?ano=${config.ano}&curso=${cursoCode}&campus=${config.campus}&periodo=${config.periodo}&complemento=*`;
  
  console.log(`[SCRAPING] ────────────────────────────────────`);
  console.log(`[SCRAPING] started: catalog period ${config.periodo}`);
  console.log(`[SCRAPING] URL: ${url}`);
  const startTime = Date.now();
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'arraybuffer'
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Decode como latin1 para preservar acentos/ç/til
    const html = Buffer.from(response.data).toString('latin1');
    let disciplinas = parseCatalogPage(html, config.periodo);
    
    console.log(`[SCRAPING] ✅ parsed: ${disciplinas.length} disciplines`);
    
    // Optionally fetch detail pages for cargaTotal and cargaSemanal
    if (includeDetails) {
      console.log(`[SCRAPING] fetching details for ${disciplinas.length} disciplines...`);
      disciplinas = await enrichWithDetails(disciplinas);
      console.log(`[SCRAPING] ✅ enriched with details`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[SCRAPING] ✅ finished successfully in ${duration}ms`);
    console.log(`[SCRAPING] ────────────────────────────────────\n`);
    
    return disciplinas;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[SCRAPING] ❌ ERROR period ${config.periodo} after ${duration}ms:`, error);
    console.log(`[SCRAPING] ────────────────────────────────────\n`);
    throw error;
  }
}

export async function scrapeSINCatalog(ano: number = 2025, includeDetails: boolean = false): Promise<CatalogDiscipline[]> {
  console.log('[SCRAPING] ════════════════════════════════════');
  console.log('[SCRAPING] started: full SIN catalog (periods 1-8)');
  console.log(`[SCRAPING] params: ano=${ano}, includeDetails=${includeDetails}`);
  const startTime = Date.now();
  
  const disciplinas: CatalogDiscipline[] = [];
  
  // Scrape periods 1-8
  for (let periodo = 1; periodo <= 8; periodo++) {
    try {
      const periodoData = await scrapePeriodo({
        ano,
        curso: 'SIN',
        campus: 'crp',
        periodo
      }, includeDetails);
      
      disciplinas.push(...periodoData);
    } catch (error) {
      console.warn(`[SCRAPING] ⚠️ failed period ${periodo}, continuing...`);
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`[SCRAPING] ✅ total disciplines: ${disciplinas.length}`);
  console.log(`[SCRAPING] ✅ finished full catalog in ${duration}ms`);
  console.log('[SCRAPING] ════════════════════════════════════\n');
  
  return disciplinas;
}

/**
 * Scrape OPTATIVAS do catálogo UFV
 * 
 * REGRA CRÍTICA:
 * Toda disciplina listada em periodo=0 é optativa
 * URL: https://www.catalogo.ufv.br/interno.php?ano=2025&curso=SIP&campus=crp&periodo=0&complemento=*
 * 
 * Estas disciplinas NÃO devem aparecer na grade, mas devem ser preservadas
 * para uso futuro (consultas, validações, etc)
 */
export async function scrapeOptativas(ano: number = 2025, includeDetails: boolean = false): Promise<CatalogDiscipline[]> {
  console.log('[SCRAPING] ════════════════════════════════════');
  console.log('[SCRAPING] started: optativas (period=0)');
  console.log(`[SCRAPING] params: ano=${ano}, includeDetails=${includeDetails}`);
  const startTime = Date.now();
  
  try {
    const optativas = await scrapePeriodo({
      ano,
      curso: 'SIN',
      campus: 'crp',
      periodo: 0  // período 0 = optativas
    }, includeDetails);
    
    const duration = Date.now() - startTime;
    console.log(`[SCRAPING] ✅ found: ${optativas.length} optativas`);
    console.log(`[SCRAPING] ✅ finished successfully in ${duration}ms`);
    console.log('[SCRAPING] ════════════════════════════════════\n');
    return optativas;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.warn(`[SCRAPING] ⚠️ failed to scrape optativas after ${duration}ms, returning empty array`);
    console.log('[SCRAPING] ════════════════════════════════════\n');
    return [];
  }
}

/**
 * Scrape catálogo completo (obrigatórias + optativas)
 */
export async function scrapeFullCatalog(ano: number = 2025, includeDetails: boolean = false): Promise<{
  obrigatorias: CatalogDiscipline[];
  optativas: CatalogDiscipline[];
}> {
  const [obrigatorias, optativas] = await Promise.all([
    scrapeSINCatalog(ano, includeDetails),
    scrapeOptativas(ano, includeDetails)
  ]);
  
  return { obrigatorias, optativas };
}

