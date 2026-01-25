import { useEffect, useState } from 'react';
import type { Discipline } from '../types/types';
import { getCourseData } from './unifiedPipeline';
import { calcularBalanceamentoGrade } from './gradeBalance';
import type { GradeBalanceResult } from './gradeBalance';

let cachedCourseData: Record<string, Discipline[]> | null = null;
let cachedGradeBalance: GradeBalanceResult | null = null;

export function useCourseData() {
  const [data, setData] = useState<Record<string, Discipline[]>>(cachedCourseData || {});
  const [loading, setLoading] = useState(!cachedCourseData);
  const [gradeBalance, setGradeBalance] = useState<GradeBalanceResult | null>(cachedGradeBalance);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const result = await getCourseData();
        cachedCourseData = result;
        
        // Calcular balanceamento da grade (todas as disciplinas obrigatórias)
        const balance = calcularBalanceamentoGrade();
        cachedGradeBalance = balance;
        
        if (isMounted) {
          setData(result);
          setGradeBalance(balance);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (!cachedCourseData) {
      load();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, loading, gradeBalance };
}

