import React, { useState, useEffect } from 'react';
import { Disciplina } from '../../types/types';
import { courseData } from '../../data/courseData';
import './CourseGrid.css';

const CourseGrid: React.FC = () => {
  const [disciplinas, setDisciplinas] = useState<Record<string, Disciplina[]>>({});
  const [highlighted, setHighlighted] = useState<string[]>([]);

  useEffect(() => {
    setDisciplinas(courseData);
  }, []);

  const handleMouseEnter = (dependencias: string) => {
    if (dependencias) {
      const depsArray = dependencias.split('|');
      setHighlighted(depsArray);
    } else {
      setHighlighted([]);
    }
  };

  const handleMouseLeave = () => {
    setHighlighted([]);
  };

  const uniqueDisciplinas = (disciplines: Disciplina[]): Disciplina[] => {
    const uniqueMap: { [key: string]: Disciplina } = {};
    disciplines.forEach(disciplina => {
      if (!uniqueMap[disciplina.NomeDisciplina]) {
        uniqueMap[disciplina.NomeDisciplina] = disciplina;
      }
    });
    return Object.values(uniqueMap);
  };

  return (
    <div className="grid">
      {Object.keys(disciplinas).map(period => (
        <div key={period} className="column">
          {uniqueDisciplinas(disciplinas[period]).map((disciplina, index) => (
            <div
              key={index}
              className={`disciplineCard ${highlighted.includes(disciplina.CodDisc) ? 'highlight' : ''}`}
              onMouseEnter={() => handleMouseEnter(disciplina.Depen)}
              onMouseLeave={handleMouseLeave}
            >
              <h5 className='disciplineCode'>{disciplina.CodDisciplina}</h5>
              <h5 className='disciplineName'>{disciplina.NomeDisciplina}</h5>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default CourseGrid;
