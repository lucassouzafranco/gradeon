/**
 * enrichmentLayer.ts
 * 
 * RESPONSABILIDADE: Merge semântico entre dados operacionais e estruturais
 * 
 * FONTES DE VERDADE:
 * 1. scraper.ts → Verdade OPERACIONAL (o que está sendo ofertado AGORA)
 *    - cod, nome, tipo, turma, horarios, sala ✅
 *    - cargaSemanal, cargaTotal, oferecida ❌ (null)
 * 
 * 2. catalogScraper.ts → Verdade ESTRUTURAL (o que a disciplina É)
 *    - cod, nome, periodo, cargaTotal, cargaSemanal ✅
 *    - dependentes ✅
 *    - prerequisitos, corequisitos ❌ (não existem no HTML)
 * 
 * 3. courseData.ts → Verdade LEGADA (dados históricos/estáticos)
 *    - Todos os campos preenchidos
 *    - Pode estar desatualizado
 *    - Usado como FALLBACK, nunca como fonte primária
 * 
 * FILOSOFIA DE MERGE:
 * - Preferir sempre scraping real ao legado
 * - Merge por código de disciplina (chave primária)
 * - null significa "não disponível", não "erro"
 * - Fallback explícito e auditável
 * - Nunca inventar dados
 */

import { RawOffer } from '../types/types';
import { CatalogDiscipline } from './catalogScraper';

/**
 * Representa um RawOffer enriquecido com dados do catálogo
 */
export interface EnrichedOffer extends RawOffer {
  // Campos adicionais do catálogo
  periodo?: number;           // Período recomendado (do catálogo)
  dependentes?: string[];     // Disciplinas que dependem desta
  
  // Metadados de enriquecimento (auditoria)
  _source: {
    operationalData: boolean;  // Veio do scraper de horários?
    catalogData: boolean;       // Foi enriquecido com catálogo?
    legacyFallback: boolean;    // Usou fallback estático?
  };
}

/**
 * Normaliza código de disciplina para comparação
 * Garante formato consistente: "SIN110" (sem espaços, uppercase)
 */
function normalizeCode(code: string): string {
  return code.replace(/\s+/g, '').toUpperCase();
}

/**
 * Merge DETERMINÍSTICO entre oferta operacional e dados de catálogo
 * 
 * REGRAS:
 * 1. Dados operacionais (horarios, sala, turma) SEMPRE vêm da oferta
 * 2. Dados estruturais (carga) preferem catálogo, mas aceitam oferta se disponível
 * 3. null em ambos = null no resultado (honesto sobre ausência)
 * 
 * @param offer - Oferta real scraped do site de horários
 * @param catalogDiscipline - Dados estruturais do catálogo (opcional)
 * @returns EnrichedOffer com merge explícito
 */
export function enrichOfferWithCatalog(
  offer: RawOffer,
  catalogDiscipline: CatalogDiscipline | undefined
): EnrichedOffer {
  
  // Dados operacionais vêm SEMPRE da oferta (verdade sobre o que está acontecendo)
  const enriched: EnrichedOffer = {
    // Operacionais - do scraper de horários
    cod: offer.cod,
    nome: offer.nome,
    tipo: offer.tipo,
    turma: offer.turma,
    horarios: offer.horarios,
    sala: offer.sala,
    
    // Estruturais - preferência: catálogo > oferta > null
    cargaSemanal: catalogDiscipline?.cargaSemanal ?? offer.cargaSemanal ?? null,
    cargaTotal: catalogDiscipline?.cargaTotal ?? offer.cargaTotal ?? null,
    periodo: catalogDiscipline?.periodo,
    dependentes: catalogDiscipline?.dependentes,
    
    // Oferecida: se está no scraping de horários, está sendo oferecida
    // (lógica de negócio, não scraping puro)
    oferecida: offer.oferecida ?? 'S',
    
    // Metadados de auditoria
    _source: {
      operationalData: true,  // Sempre true se veio do scraper
      catalogData: catalogDiscipline !== undefined,
      legacyFallback: false   // Não usado neste merge
    }
  };
  
  return enriched;
}

/**
 * Enriquece múltiplas ofertas com dados do catálogo
 * 
 * ESTRATÉGIA:
 * - Cria índice por código normalizado para O(1) lookup
 * - Faz merge disciplina por disciplina
 * - Preserva ofertas mesmo sem correspondência no catálogo
 * 
 * @param offers - Ofertas do scraper de horários
 * @param catalogDisciplines - Disciplinas do catálogo (pode estar vazio)
 * @returns Array de ofertas enriquecidas
 */
export function enrichOffersWithCatalog(
  offers: RawOffer[],
  catalogDisciplines: CatalogDiscipline[]
): EnrichedOffer[] {
  
  // Índice por código normalizado para lookup eficiente
  const catalogIndex = new Map<string, CatalogDiscipline>();
  for (const disc of catalogDisciplines) {
    catalogIndex.set(normalizeCode(disc.cod), disc);
  }
  
  // Merge cada oferta com seu correspondente no catálogo (se existir)
  return offers.map(offer => {
    const normalizedCode = normalizeCode(offer.cod);
    const catalogData = catalogIndex.get(normalizedCode);
    
    return enrichOfferWithCatalog(offer, catalogData);
  });
}

/**
 * Fallback para dados legados quando scraping falha completamente
 * 
 * QUANDO USAR:
 * - Scraping de horários falhou (site offline, formato mudou)
 * - Catálogo falhou ou não foi buscado
 * - Última linha de defesa para manter frontend funcionando
 * 
 * MARCA EXPLICITAMENTE que os dados são fallback (auditável)
 * 
 * @param legacyOffer - Oferta do courseData.ts (estático)
 * @returns EnrichedOffer com flag de fallback ativada
 */
export function createFallbackOffer(legacyOffer: RawOffer): EnrichedOffer {
  return {
    ...legacyOffer,
    _source: {
      operationalData: false,  // NÃO veio de scraping real
      catalogData: false,       // NÃO foi enriquecido
      legacyFallback: true      // Dados históricos/estáticos
    }
  };
}

/**
 * Estatísticas de enriquecimento para auditoria
 */
export interface EnrichmentStats {
  total: number;
  enrichedWithCatalog: number;
  missingCatalogData: number;
  withCompleteCarga: number;
  fallbackUsed: number;
}

/**
 * Calcula estatísticas de enriquecimento
 * Útil para debugging e validação
 */
export function calculateEnrichmentStats(offers: EnrichedOffer[]): EnrichmentStats {
  return {
    total: offers.length,
    enrichedWithCatalog: offers.filter(o => o._source.catalogData).length,
    missingCatalogData: offers.filter(o => !o._source.catalogData && !o._source.legacyFallback).length,
    withCompleteCarga: offers.filter(o => o.cargaSemanal !== null && o.cargaTotal !== null).length,
    fallbackUsed: offers.filter(o => o._source.legacyFallback).length
  };
}
