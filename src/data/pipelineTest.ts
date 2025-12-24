import { courseData as originalCourseData } from './courseData';
import { buildCourseData } from './pipeline';

export function testPipelineEquivalence(): boolean {
  console.log('=== Testing Pipeline Equivalence ===');

  try {
    const pipelineOutput = buildCourseData();

    const originalPeriods = Object.keys(originalCourseData).sort();
    const pipelinePeriods = Object.keys(pipelineOutput).sort();

    console.log(`Original periods: ${originalPeriods.join(', ')}`);
    console.log(`Pipeline periods: ${pipelinePeriods.join(', ')}`);

    const originalTotal = Object.values(originalCourseData)
      .reduce((sum, arr) => sum + arr.length, 0);
    const pipelineTotal = Object.values(pipelineOutput)
      .reduce((sum, arr) => sum + arr.length, 0);

    console.log(`Original total disciplines: ${originalTotal}`);
    console.log(`Pipeline total disciplines: ${pipelineTotal}`);

    console.log('Pipeline test completed');
    return true;

  } catch (error) {
    console.error('Pipeline test failed:', error);
    return false;
  }
}
