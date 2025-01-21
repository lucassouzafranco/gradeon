import React, { useState, useEffect } from 'react';
import { Discipline } from '../../types/types';
import { courseData } from '../../data/courseData';
import './CourseGrid.css';

interface CourseGridProps {
  setSelectedDiscipline: React.Dispatch<React.SetStateAction<Discipline | null>>;
  selectedCards: Discipline[];
  setSelectedCards: React.Dispatch<React.SetStateAction<Discipline[]>>;
}

const CourseGrid: React.FC<CourseGridProps> = ({ setSelectedDiscipline, selectedCards, setSelectedCards }) => {
  const [disciplinas, setDisciplinas] = useState<Record<string, Discipline[]>>({});
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [draggedDiscipline, setDraggedDiscipline] = useState<Discipline | null>(null);

  useEffect(() => {
    setDisciplinas(courseData);
  }, []);

  const handleDragStart = (disciplina: Discipline) => {
    setDraggedDiscipline(disciplina);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = () => {
    if (draggedDiscipline) {
      setSelectedDiscipline(draggedDiscipline);
      setDraggedDiscipline(null);
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

  const handleCardClick = (disciplina: Discipline) => {
    setSelectedCards(prevSelected => {
      const isSelected = prevSelected.some(d => d.CodDisciplina === disciplina.CodDisciplina);
      const newSelected = isSelected
        ? prevSelected.filter(d => d.CodDisciplina !== disciplina.CodDisciplina)
        : [...prevSelected, disciplina];
      console.log('Updated Selected Cards:', newSelected);
      return newSelected;
    });
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
              } ${draggedDiscipline && draggedDiscipline !== disciplina ? 'faded' : ''} ${
                selectedCards.some(d => d.CodDisciplina === disciplina.CodDisciplina) ? 'selected' : ''
              }`}
              draggable
              onDragStart={() => handleDragStart(disciplina)}
              onMouseEnter={() => handleMouseEnter(disciplina.Depen, disciplina)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleCardClick(disciplina)}
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