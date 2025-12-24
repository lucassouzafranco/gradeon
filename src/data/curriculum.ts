import { CurriculumDiscipline } from '../types/types';

export const curriculumData: CurriculumDiscipline[] = [
  // Period 1
  { cod: 'CRP 199', periodo: 1, prerequisitos: [], obrigatoria: true },
  { cod: 'SIN 100', periodo: 1, prerequisitos: [], obrigatoria: true },
  { cod: 'SIN 110', periodo: 1, prerequisitos: [], obrigatoria: true },
  { cod: 'SIN 101', periodo: 1, prerequisitos: [], obrigatoria: true },
  { cod: 'ESP 105', periodo: 1, prerequisitos: [], obrigatoria: false },
  
  // Period 2
  { cod: 'CRP 297', periodo: 2, prerequisitos: ['CRP 199'], obrigatoria: true },
  { cod: 'SIN 130', periodo: 2, prerequisitos: [], obrigatoria: true },
  { cod: 'SIN 131', periodo: 2, prerequisitos: ['SIN 110'], obrigatoria: true },
  { cod: 'SIN 132', periodo: 2, prerequisitos: ['SIN 100'], obrigatoria: true },
  { cod: 'CIC 100', periodo: 2, prerequisitos: [], obrigatoria: true },
  
  // Period 3
  { cod: 'CRP 298', periodo: 3, prerequisitos: ['CRP 297'], obrigatoria: true },
  { cod: 'SIN 141', periodo: 3, prerequisitos: ['SIN 131'], obrigatoria: true },
  { cod: 'SIN 142', periodo: 3, prerequisitos: ['SIN 130'], obrigatoria: true },
  { cod: 'SIN 143', periodo: 3, prerequisitos: ['SIN 132'], obrigatoria: true },
  { cod: 'ADE 104', periodo: 3, prerequisitos: [], obrigatoria: false },
  
  // Period 4
  { cod: 'SIN 211', periodo: 4, prerequisitos: ['SIN 141'], obrigatoria: true },
  { cod: 'SIN 213', periodo: 4, prerequisitos: ['SIN 142'], obrigatoria: true },
  { cod: 'SIN 220', periodo: 4, prerequisitos: ['SIN 143'], obrigatoria: true },
  { cod: 'SIN 221', periodo: 4, prerequisitos: ['CRP 298'], obrigatoria: true },
  { cod: 'SIN 222', periodo: 4, prerequisitos: [], obrigatoria: true },
  
  // Period 5
  { cod: 'SIN 251', periodo: 5, prerequisitos: ['SIN 213'], obrigatoria: true },
  { cod: 'SIN 252', periodo: 5, prerequisitos: ['SIN 220'], obrigatoria: true },
  { cod: 'SIN 320', periodo: 5, prerequisitos: ['SIN 211'], obrigatoria: true },
  { cod: 'SIN 321', periodo: 5, prerequisitos: ['SIN 221'], obrigatoria: true },
  { cod: 'SIN 322', periodo: 5, prerequisitos: ['SIN 222'], obrigatoria: true },
  
  // Period 6
  { cod: 'SIN 323', periodo: 6, prerequisitos: ['SIN 321'], obrigatoria: true },
  { cod: 'SIN 351', periodo: 6, prerequisitos: ['SIN 251'], obrigatoria: true },
  { cod: 'SIN 392', periodo: 6, prerequisitos: ['SIN 252'], obrigatoria: true },
  { cod: 'ADE 327', periodo: 6, prerequisitos: [], obrigatoria: false },
  { cod: 'ADE 190', periodo: 6, prerequisitos: [], obrigatoria: false },
  
  // Period 7
  { cod: 'SIN 421', periodo: 7, prerequisitos: ['SIN 323'], obrigatoria: true },
  { cod: 'SIN 422', periodo: 7, prerequisitos: ['SIN 351'], obrigatoria: true },
  { cod: 'SIN 480', periodo: 7, prerequisitos: ['SIN 392'], obrigatoria: true },
  
  // Period 8
  { cod: 'SIN 496', periodo: 8, prerequisitos: ['SIN 421'], obrigatoria: true },
  { cod: 'SIN 498', periodo: 8, prerequisitos: ['SIN 422'], obrigatoria: true },
  { cod: 'SIN 499', periodo: 8, prerequisitos: ['SIN 480'], obrigatoria: true },
];

export function getCurriculumInfo(cod: string): CurriculumDiscipline | undefined {
  return curriculumData.find(d => d.cod === cod);
}
