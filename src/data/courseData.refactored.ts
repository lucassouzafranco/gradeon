import { Discipline } from '../types/types';
import { buildCourseData } from './pipeline';

export const courseData: Record<string, Discipline[]> = buildCourseData();

console.log('[courseData.refactored] Loaded course data');
console.log(`[courseData.refactored] Periods: ${Object.keys(courseData).length}`);
console.log(`[courseData.refactored] Total entries: ${
  Object.values(courseData).reduce((sum, arr) => sum + arr.length, 0)
}`);
