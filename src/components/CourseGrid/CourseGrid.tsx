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
  const [draggedDiscipline, setDraggedDiscipline] = useState<Discipline | null>(null); // Armazena disciplina sendo arrastada

  useEffect(() => {
    setDisciplinas(courseData);
  }, []);

  // Lida com o evento de arrastar
  const handleDragStart = (disciplina: Discipline) => {
    setDraggedDiscipline(disciplina); // Armazena disciplina arrastada
  };

  // Permite que o drop ocorra
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessário para permitir o drop
  };

  // Lida com o drop
  const handleDrop = () => {
    if (draggedDiscipline) {
      setSelectedDiscipline(draggedDiscipline); // Define disciplina arrastada como selecionada
      setDraggedDiscipline(null); // Reseta disciplina arrastada
    }
  };

  const handleMouseEnter = (dependencias: string, disciplina: Discipline) => {
    const depsArray = dependencias ? dependencias.split('|') : [];
    setHighlighted(depsArray);
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
    <div className="grid" onDragOver={handleDragOver} onDrop={handleDrop}>
      {Object.keys(disciplinas).map(period => (
        <div key={period} className="column">
          {uniqueDisciplinas(disciplinas[period]).map((disciplina, index) => (
            <div
              key={index}
              className={`disciplineCard ${
                highlighted.includes(disciplina.CodDisc) ? 'highlight' : ''
              } ${draggedDiscipline && draggedDiscipline !== disciplina ? 'faded' : ''}`} // Adiciona a classe 'faded' para cards que não estão sendo arrastados
              draggable
              onDragStart={() => handleDragStart(disciplina)}
              onMouseEnter={() => handleMouseEnter(disciplina.Depen, disciplina)}
              onMouseLeave={handleMouseLeave}
            >
              <h5 className="disciplineCode">{disciplina.CodDisc}</h5>
              <h5 className="disciplineName">{disciplina.NomeDisciplina}</h5>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default CourseGrid;
