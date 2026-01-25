import { Discipline } from '../types/types';
import { buildCourseData } from './pipeline';
import { logger } from '../utils/logger';

export const courseData: Record<string, Discipline[]> = buildCourseData();

logger.debug('[courseData.refactored] Loaded course data');
logger.debug(`[courseData.refactored] Periods: ${Object.keys(courseData).length}`);
logger.debug(`[courseData.refactored] Total entries: ${
  Object.values(courseData).reduce((sum, arr) => sum + arr.length, 0)
}`);
