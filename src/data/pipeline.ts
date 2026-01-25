import { Discipline } from '../types/types';
import { getCurrentRawOffers } from './rawOfferExtractor';
import { curriculumData } from './curriculum';
import { mergeOffersWithCurriculum, validateNormalizedData } from './merge';
import { toLegacyCourseData, validateLegacyFormat } from './adapter';
import { logger } from '../utils/logger';

export function buildCourseData(): Record<string, Discipline[]> {
  const rawOffers = getCurrentRawOffers();
  logger.info(`Pipeline: Extracted ${rawOffers.length} raw offers`);

  const normalized = mergeOffersWithCurriculum(rawOffers, curriculumData);
  logger.info(`Pipeline: Merged into ${normalized.length} normalized disciplines`);

  if (!validateNormalizedData(normalized)) {
    logger.warn('Pipeline: Normalized data validation failed');
    throw new Error('Data pipeline validation failed at normalization stage');
  }

  const legacyData = toLegacyCourseData(normalized);
  logger.info(`Pipeline: Converted to legacy format with ${Object.keys(legacyData).length} periods`);

  if (!validateLegacyFormat(legacyData)) {
    logger.warn('Pipeline: Legacy format validation failed');
    throw new Error('Data pipeline validation failed at legacy conversion stage');
  }

  return legacyData;
}

export function getNormalizedData() {
  const rawOffers = getCurrentRawOffers();
  return mergeOffersWithCurriculum(rawOffers, curriculumData);
}
