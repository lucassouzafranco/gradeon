/**
 * ÍNDICE DE DADOS - Sistema Unificado
 * 
 * Este arquivo serve como ponto de entrada centralizado para todo o sistema de dados.
 * Reexporta as APIs principais para facilitar importações no frontend.
 */

// ============================================================================
// API PRINCIPAL - USE ESTA
// ============================================================================

/**
 * getCourseData() - API RECOMENDADA para o frontend
 * 
 * Retorna: Record<string, Discipline[]>
 * 
 * Exemplo:
 * ```typescript
 * import { getCourseData } from '@/data';
 * 
 * const data = await getCourseData();
 * // { "1": [...], "2": [...], ..., "8": [...] }
 * ```
 */
export { getCourseData, getUnifiedCourseData } from './unifiedPipeline';
export { useCourseData } from './useCourseData';

// ============================================================================
// TIPOS
// ============================================================================

export type { Discipline } from '../types/types';
export type { UnifiedPipelineResult } from './unifiedPipeline';
export type { EnrichedOffer } from './enrichmentLayer';

// ============================================================================
// FALLBACK DE EMERGÊNCIA (NÃO USAR DIRETAMENTE)
// ============================================================================

/**
 * courseData - APENAS PARA FALLBACK INTERNO
 * 
 * ⚠️ NÃO IMPORTE DIRETAMENTE NO FRONTEND
 * Use getCourseData() que gerencia fallback automaticamente
 */
export { courseData } from './courseData';

// ============================================================================
// SCRAPERS (USO INTERNO)
// ============================================================================

export { getSINOffers } from './scraper';
export { scrapeSINCatalog, scrapeOptativas, scrapeFullCatalog } from './catalogScraper';

// ============================================================================
// ORCHESTRATOR (USO INTERNO/AVANÇADO)
// ============================================================================

export { 
  getUnifiedSINOffers, 
  getDefaultSINOffers,
  clearCatalogCache,
  getCacheInfo 
} from './orchestrator';

// ============================================================================
// DOCUMENTAÇÃO
// ============================================================================

/**
 * ARQUITETURA COMPLETA:
 * Ver: /INTEGRATION.md
 * 
 * FLUXO DE DADOS:
 * 
 * Frontend → getCourseData()
 *              ↓
 *         UnifiedPipeline
 *              ↓
 *      ┌───────┴────────┐
 *      ↓                ↓
 * Orchestrator    Optativas
 *      ↓
 * Enrichment
 *      ↓
 *   Scrapers
 * 
 * FALLBACK:
 * Scraping falha → courseData legado
 * 
 * REGRAS:
 * - Optativas (periodo=0) filtradas automaticamente
 * - Dedupe de turmas automático
 * - Contrato estável: Record<string, Discipline[]>
 */
