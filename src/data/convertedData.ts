import { Discipline } from '../types/types';
import { courseData } from './courseData';

export const convertedData: Record<number, Discipline[]> = Object.entries(courseData).reduce((acc, [periodo, disciplinas]) => {
  const periodoNum = parseInt(periodo);
  acc[periodoNum] = disciplinas.map((discipline: Discipline) => ({
    ...discipline,
    Periodo: periodoNum
  }));
  return acc;
}, {} as Record<number, Discipline[]>);

