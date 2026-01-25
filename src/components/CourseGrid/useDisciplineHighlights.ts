import { useState } from 'react';
import type { Discipline } from '../../types/types';

export function useDisciplineHighlights(
  setSelectedDiscipline: React.Dispatch<React.SetStateAction<Discipline | null>>
) {
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  const handleMouseEnter = (disciplina: Discipline) => {
    setHoveredCode(disciplina.CodDisc);

    const codesToHighlight: string[] = [];
    if (disciplina.Prerequisitos && disciplina.Prerequisitos.length > 0) {
      disciplina.Prerequisitos.forEach(prereq => {
        codesToHighlight.push(prereq.replace(/\s+/g, ''));
      });
    }

    if (disciplina.Dependentes && disciplina.Dependentes.length > 0) {
      disciplina.Dependentes.forEach(dep => {
        codesToHighlight.push(dep.replace(/\s+/g, ''));
      });
    }

    setHighlighted(codesToHighlight);
    setSelectedDiscipline(disciplina);
  };

  const handleMouseLeave = () => {
    setHoveredCode(null);
    setHighlighted([]);
    setSelectedDiscipline(null);
  };

  return { highlighted, hoveredCode, handleMouseEnter, handleMouseLeave };
}
