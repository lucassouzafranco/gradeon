import React, { useState, useEffect } from 'react';
import { Discipline } from '../../types/types';
import { courseData } from '../../data/courseData';
import './CourseGrid.css';

interface CourseGridProps {
  setSelectedDiscipline: React.Dispatch<React.SetStateAction<Discipline | null>>;
}

const CourseGrid: React.FC<CourseGridProps> = ({ setSelectedDiscipline }) => {
  const [disciplinas, setDisciplinas] = useState<Record<string, Discipline[]>>({});
  const [highlighted, setHighlighted] = useState<string[]>([]);

  useEffect(() => {
    setDisciplinas(courseData);
  }, []);

  // lida com o evento de entrada do mouse, recebendo dependências e uma disciplina
  const handleMouseEnter = (dependencias: string, disciplina: Discipline) => {
    // divide a string de dependências em um array ou inicializa como vazio.
    const depsArray = dependencias ? dependencias.split('|') : []; 
    setHighlighted(depsArray);  // atualiza o estado para destacar disciplinas dependentes.
    setSelectedDiscipline(disciplina); 
  };

  const handleMouseLeave = () => {
    setHighlighted([]);
    setSelectedDiscipline(null);
  };

  const uniqueDisciplinas = (disciplines: Discipline[]): Discipline[] => {
    const uniqueMap: { [key: string]: Discipline } = {};
    disciplines.forEach(discipline => {
      if (!uniqueMap[discipline.NomeDisciplina]) {
        uniqueMap[discipline.NomeDisciplina] = discipline;
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
              onMouseEnter={() => handleMouseEnter(disciplina.Depen, disciplina)}
              onMouseLeave={handleMouseLeave}
            >
              <h5 className='disciplineCode'>{disciplina.CodDisc}</h5>
              <h5 className='disciplineName'>{disciplina.NomeDisciplina}</h5>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default CourseGrid;
