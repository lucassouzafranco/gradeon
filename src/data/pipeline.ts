import { Discipline } from '../types/types';
import { getCurrentRawOffers } from './rawOfferExtractor';
import { curriculumData } from './curriculum';
import { mergeOffersWithCurriculum, validateNormalizedData } from './merge';
import { toLegacyCourseData, validateLegacyFormat } from './adapter';

export function buildCourseData(): Record<string, Discipline[]> {
  const rawOffers = getCurrentRawOffers();
  console.log(`Pipeline: Extracted ${rawOffers.length} raw offers`);

  const normalized = mergeOffersWithCurriculum(rawOffers, curriculumData);
  console.log(`Pipeline: Merged into ${normalized.length} normalized disciplines`);

  if (!validateNormalizedData(normalized)) {
    console.error('Pipeline: Normalized data validation failed');
    throw new Error('Data pipeline validation failed at normalization stage');
  }

  const legacyData = toLegacyCourseData(normalized);
  console.log(`Pipeline: Converted to legacy format with ${Object.keys(legacyData).length} periods`);

  if (!validateLegacyFormat(legacyData)) {
    console.error('Pipeline: Legacy format validation failed');
    throw new Error('Data pipeline validation failed at legacy conversion stage');
  }

  return legacyData;
}

export function getNormalizedData() {
  const rawOffers = getCurrentRawOffers();
  return mergeOffersWithCurriculum(rawOffers, curriculumData);
}
