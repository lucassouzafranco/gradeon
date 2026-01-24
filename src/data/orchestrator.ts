/**
 * orchestrator.ts
 * 
 * RESPONSABILIDADE: Orquestração de alto nível das fontes de dados
 * 
 * Esta é a API ÚNICA que o frontend deve usar.
 * Gerencia:
 * - Scraping de ofertas operacionais
 * - Scraping de catálogo (com cache)
 * - Merge semântico
 * - Fallback gracioso
 * - Logging e auditoria
 * 
 * HIERARQUIA DE FONTES (em ordem de preferência):
 * 1. Scraping real (horários) + Catálogo (estrutural)
 * 2. Scraping real (horários) + Fallback de carga
 * 3. Dados legados completos (último recurso)
 */

import { RawOffer } from '../types/types';
import { getSINOffers } from './scraper';
import { scrapeSINCatalog, CatalogDiscipline } from './catalogScraper';
import { 
  enrichOffersWithCatalog, 
  createFallbackOffer,
  EnrichedOffer,
  calculateEnrichmentStats
} from './enrichmentLayer';
import { getCurrentRawOffers } from './rawOfferExtractor';

/**
 * Cache simples de catálogo
 * Evita re-scraping do catálogo que muda raramente
 */
interface CatalogCache {
  data: CatalogDiscipline[];
  timestamp: number;
  ano: number;
}

let catalogCache: CatalogCache | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas

/**
 * Configuração para orquestração
 */
export interface OrchestratorConfig {
  ano: number;
  semestre: 1 | 2;
  useCatalog: boolean;      // Buscar dados do catálogo?
  forceCatalogRefresh: boolean;  // Forçar atualização do cache?
  fallbackOnError: boolean; // Usar legado se scraping falhar?
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  ano: 2025,
  semestre: 2,
  useCatalog: true,
  forceCatalogRefresh: false,
  fallbackOnError: true
};

/**
 * Resultado da orquestração com metadados
 */
export interface OrchestrationResult {
  offers: EnrichedOffer[];
  metadata: {
    scrapingSucceeded: boolean;
    catalogUsed: boolean;
    catalogFromCache: boolean;
    fallbackUsed: boolean;
    timestamp: number;
    stats: {
      total: number;
      enrichedWithCatalog: number;
      withCompleteCarga: number;
      fallbackCount: number;
    };
  };
}

/**
 * Busca catálogo com cache inteligente
 * 
 * LÓGICA:
 * - Se cache válido e não forçar refresh: retorna cache
 * - Caso contrário: faz scraping e atualiza cache
 * - Em erro: retorna cache antigo se existir
 */
async function getCatalogWithCache(
  ano: number,
  forceRefresh: boolean
): Promise<{ data: CatalogDiscipline[], fromCache: boolean }> {
  
  const now = Date.now();
  
  // Verificar cache válido
  if (
    !forceRefresh &&
    catalogCache &&
    catalogCache.ano === ano &&
    (now - catalogCache.timestamp) < CACHE_TTL_MS
  ) {
    console.log('📦 Using cached catalog data');
    return { data: catalogCache.data, fromCache: true };
  }
  
  // Cache inválido ou refresh forçado - fazer scraping
  try {
    console.log('🌐 Fetching fresh catalog data...');
    const data = await scrapeSINCatalog(ano, true); // Com detalhes
    
    // Atualizar cache
    catalogCache = { data, timestamp: now, ano };
    console.log(`✅ Catalog cached: ${data.length} disciplines`);
    
    return { data, fromCache: false };
  } catch (error) {
    console.warn('⚠️ Failed to fetch catalog:', error);
    
    // Se tem cache antigo, usar mesmo que expirado
    if (catalogCache && catalogCache.ano === ano) {
      console.log('📦 Using expired cache as fallback');
      return { data: catalogCache.data, fromCache: true };
    }
    
    // Sem cache, retornar vazio
    console.log('❌ No catalog data available');
    return { data: [], fromCache: false };
  }
}

/**
 * Função principal de orquestração
 * 
 * FLUXO:
 * 1. Tentar scraping de ofertas operacionais
 * 2. Se useCatalog: buscar/cache catálogo
 * 3. Fazer merge semântico
 * 4. Em falha completa: usar dados legados
 * 5. Retornar com metadados completos
 * 
 * @param config - Configuração de orquestração
 * @returns Resultado com ofertas enriquecidas e metadados
 */
export async function getUnifiedSINOffers(
  config: Partial<OrchestratorConfig> = {}
): Promise<OrchestrationResult> {
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  
  console.log('🚀 Starting unified data orchestration...');
  console.log(`   Config: ano=${finalConfig.ano}, semestre=${finalConfig.semestre}, useCatalog=${finalConfig.useCatalog}`);
  
  let scrapingSucceeded = false;
  let catalogUsed = false;
  let catalogFromCache = false;
  let fallbackUsed = false;
  
  try {
    // FASE 1: Scraping de ofertas operacionais
    console.log('\n📋 FASE 1: Fetching operational data (horários)...');
    let offers: RawOffer[];
    
    try {
      offers = await getSINOffers(finalConfig.ano, finalConfig.semestre);
      scrapingSucceeded = true;
      console.log(`✅ Scraped ${offers.length} offers from registration site`);
    } catch (error) {
      console.warn('⚠️ Scraping failed:', error);
      
      if (finalConfig.fallbackOnError) {
        console.log('🔄 Falling back to legacy data...');
        offers = getCurrentRawOffers();
        fallbackUsed = true;
        console.log(`📦 Using ${offers.length} legacy offers`);
      } else {
        throw error; // Propagar erro se fallback desabilitado
      }
    }
    
    // FASE 2: Buscar dados do catálogo (opcional)
    let catalogDisciplines: CatalogDiscipline[] = [];
    
    if (finalConfig.useCatalog && scrapingSucceeded) {
      console.log('\n📚 FASE 2: Fetching catalog data (structural)...');
      try {
        const catalogResult = await getCatalogWithCache(
          finalConfig.ano,
          finalConfig.forceCatalogRefresh
        );
        catalogDisciplines = catalogResult.data;
        catalogUsed = catalogDisciplines.length > 0;
        catalogFromCache = catalogResult.fromCache;
        console.log(`✅ Catalog data: ${catalogDisciplines.length} disciplines`);
      } catch (error) {
        console.warn('⚠️ Catalog fetch failed, continuing without it:', error);
        // Não é crítico - continua sem catálogo
      }
    } else if (!scrapingSucceeded) {
      console.log('\n⏭️  FASE 2: Skipping catalog (using fallback data)');
    }
    
    // FASE 3: Merge semântico
    console.log('\n🔀 FASE 3: Merging operational + structural data...');
    let enrichedOffers: EnrichedOffer[];
    
    if (fallbackUsed) {
      // Dados legados já vêm completos - marcar como fallback
      enrichedOffers = offers.map(createFallbackOffer);
      console.log(`📦 Using ${enrichedOffers.length} fallback offers`);
    } else {
      // Merge real entre scraping e catálogo
      enrichedOffers = enrichOffersWithCatalog(offers, catalogDisciplines);
      const stats = calculateEnrichmentStats(enrichedOffers);
      console.log(`✅ Enriched ${stats.enrichedWithCatalog}/${stats.total} offers with catalog data`);
      console.log(`   Complete carga: ${stats.withCompleteCarga}/${stats.total}`);
    }
    
    // Estatísticas finais
    const finalStats = calculateEnrichmentStats(enrichedOffers);
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Orchestration complete in ${duration}ms`);
    console.log(`   Total offers: ${finalStats.total}`);
    console.log(`   Enriched: ${finalStats.enrichedWithCatalog}`);
    console.log(`   With complete carga: ${finalStats.withCompleteCarga}`);
    console.log(`   Fallback used: ${finalStats.fallbackUsed}`);
    
    return {
      offers: enrichedOffers,
      metadata: {
        scrapingSucceeded,
        catalogUsed,
        catalogFromCache,
        fallbackUsed,
        timestamp: Date.now(),
        stats: {
          total: finalStats.total,
          enrichedWithCatalog: finalStats.enrichedWithCatalog,
          withCompleteCarga: finalStats.withCompleteCarga,
          fallbackCount: finalStats.fallbackUsed
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Orchestration failed completely:', error);
    
    // Último recurso: dados legados
    if (finalConfig.fallbackOnError) {
      console.log('🆘 Emergency fallback to legacy data...');
      const legacyOffers = getCurrentRawOffers();
      const fallbackOffers = legacyOffers.map(createFallbackOffer);
      
      return {
        offers: fallbackOffers,
        metadata: {
          scrapingSucceeded: false,
          catalogUsed: false,
          catalogFromCache: false,
          fallbackUsed: true,
          timestamp: Date.now(),
          stats: {
            total: fallbackOffers.length,
            enrichedWithCatalog: 0,
            withCompleteCarga: fallbackOffers.length, // Legado tem tudo
            fallbackCount: fallbackOffers.length
          }
        }
      };
    }
    
    throw error;
  }
}

/**
 * Versão simplificada para uso comum
 * Usa configuração default
 */
export async function getDefaultSINOffers(): Promise<EnrichedOffer[]> {
  const result = await getUnifiedSINOffers();
  return result.offers;
}

/**
 * Limpa cache do catálogo
 * Útil para testes ou atualização forçada
 */
export function clearCatalogCache(): void {
  catalogCache = null;
  console.log('🗑️  Catalog cache cleared');
}

/**
 * Retorna informações do cache
 * Útil para debugging
 */
export function getCacheInfo(): { cached: boolean, age?: number, disciplines?: number } {
  if (!catalogCache) {
    return { cached: false };
  }
  
  return {
    cached: true,
    age: Date.now() - catalogCache.timestamp,
    disciplines: catalogCache.data.length
  };
}
