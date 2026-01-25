/**
 * UNIFIED PIPELINE - Camada unica de dados para o frontend
 * 
 * Logs detalhados mostram cada fase do processamento.
 * Execute com npm run dev e veja logs no console do browser.
 */

import { Discipline } from '../types/types';
import { getUnifiedSINOffers } from './orchestrator';
import { scrapeOptativas } from './catalogScraper';
import { courseData as legacyCourseData } from './courseData';
import type { EnrichedOffer } from './enrichmentLayer';
import scrapedData from './scrapedData.json';
import { isValidScrapedData } from './validateScrapedData';
import { logger } from '../utils/logger';

export interface UnifiedPipelineResult {
  courseData: Record<string, Discipline[]>;
  metadata: {
    source: 'scraping' | 'fallback';
    totalDisciplines: number;
    optativesFiltered: number;
    scrapingSucceeded: boolean;
    timestamp: string;
  };
}

let cachedResult: UnifiedPipelineResult | null = null;

function isOptativa(offer: EnrichedOffer, optativasCodes: Set<string>): boolean {
  const normalizedCode = offer.cod.replace(/\s+/g, '').toUpperCase();
  return optativasCodes.has(normalizedCode);
}

function deduplicateTurmas(offers: EnrichedOffer[]): EnrichedOffer[] {
  const uniqueMap = new Map<string, EnrichedOffer>();
  
  for (const offer of offers) {
    if (!uniqueMap.has(offer.cod)) {
      uniqueMap.set(offer.cod, offer);
    }
  }
  
  return Array.from(uniqueMap.values());
}

function toLegacyFormat(offers: EnrichedOffer[]): Record<string, Discipline[]> {
  const grouped: Record<string, Discipline[]> = {};
  
  for (const offer of offers) {
    const periodo = offer.periodo?.toString() || '0';
    
    if (!grouped[periodo]) {
      grouped[periodo] = [];
    }
    
    grouped[periodo].push({
      CodDisciplina: offer.cod,
      Tipo: offer.tipo || 'T',
      Turma: offer.turma || '1',
      Horarios: offer.horarios || '',
      Sala: offer.sala || '',
      Periodo: offer.periodo || 0,
      NomeDisciplina: offer.nome || offer.cod,
      CargaSemanal: offer.cargaSemanal || '',
      CargaTotal: offer.cargaTotal || 0,
      Dependencias: '',
      Oferecida: offer.oferecida || 'S',
      CodDisc: offer.cod.replace(/\s+/g, ''),
      Depen: ''
    });
  }
  
  return grouped;
}

export async function getUnifiedCourseData(): Promise<UnifiedPipelineResult> {
  if (cachedResult) {
    return cachedResult;
  }

  try {
    // Preferir dados gerados no build (sem logs no browser)
    if (isValidScrapedData(scrapedData) && scrapedData?.metadata?.generatedAt) {
      cachedResult = {
        courseData: scrapedData.courseData,
        metadata: {
          source: 'scraping',
          totalDisciplines: scrapedData.metadata.totalDisciplinas ?? 0,
          optativesFiltered: 0,
          scrapingSucceeded: true,
          timestamp: scrapedData.metadata.generatedAt
        }
      };
      return cachedResult;
    }
    
    const [optativasResult, scrapingResult] = await Promise.allSettled([
      scrapeOptativas(2025, false),
      getUnifiedSINOffers({
        useCatalog: true,
        fallbackOnError: false
      })
    ]);
    
    const optativasCodes = new Set<string>();
    if (optativasResult.status === 'fulfilled') {
      optativasResult.value.forEach(opt => {
        optativasCodes.add(opt.cod.replace(/\s+/g, '').toUpperCase());
      });
    }
    
    // Valida scraping
    if (scrapingResult.status === 'rejected' || !scrapingResult.value.metadata.scrapingSucceeded) {
      throw new Error('Scraping failed');
    }
    
    const allOffers = scrapingResult.value.offers;
    const obrigatorias = allOffers.filter(offer => !isOptativa(offer, optativasCodes));
    const optativasCount = allOffers.length - obrigatorias.length;
    const unique = deduplicateTurmas(obrigatorias);
    const courseData = toLegacyFormat(unique);
    

    
    cachedResult = {
      courseData,
      metadata: {
        source: 'scraping',
        totalDisciplines: unique.length,
        optativesFiltered: optativasCount,
        scrapingSucceeded: true,
        timestamp: new Date().toISOString()
      }
    };
    return cachedResult;
    
  } catch (error) {
    const totalLegacy = Object.values(legacyCourseData).reduce((acc, arr) => acc + arr.length, 0);
    logger.warn('Unified pipeline fallback used:', error);

    cachedResult = {
      courseData: legacyCourseData,
      metadata: {
        source: 'fallback',
        totalDisciplines: totalLegacy,
        optativesFiltered: 0,
        scrapingSucceeded: false,
        timestamp: new Date().toISOString()
      }
    };
    return cachedResult;
  }
}

export async function getCourseData(): Promise<Record<string, Discipline[]>> {
  const result = await getUnifiedCourseData();
  return result.courseData;
}
