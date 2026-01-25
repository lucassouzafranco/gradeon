import { useEffect, useState } from 'react';
import type { Discipline } from '../types/types';
import { getCourseData } from './unifiedPipeline';

let cachedCourseData: Record<string, Discipline[]> | null = null;

export function useCourseData() {
  const [data, setData] = useState<Record<string, Discipline[]>>(cachedCourseData || {});
  const [loading, setLoading] = useState(!cachedCourseData);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const result = await getCourseData();
        cachedCourseData = result;
        if (isMounted) {
          setData(result);
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

  return { data, loading };
}
