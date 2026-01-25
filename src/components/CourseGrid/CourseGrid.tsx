import React, { useState } from 'react';
import { Discipline } from '../../types/types';
import { useCourseData } from '../../data';
import { logger } from '../../utils/logger';
import './CourseGrid.css';
import { useDisciplineHighlights } from './useDisciplineHighlights';

interface CourseGridProps {
  setSelectedDiscipline: React.Dispatch<React.SetStateAction<Discipline | null>>;
  selectedCards: Discipline[];
  setSelectedCards: React.Dispatch<React.SetStateAction<Discipline[]>>;
}

const CourseGrid: React.FC<CourseGridProps> = ({ setSelectedDiscipline, selectedCards, setSelectedCards }) => {
  const { data: disciplinas, loading } = useCourseData();
  const { highlighted, hoveredCode, handleMouseEnter, handleMouseLeave } = useDisciplineHighlights(setSelectedDiscipline);
  const [draggedDiscipline, setDraggedDiscipline] = useState<Discipline | null>(null);

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

  const handleCardClick = (disciplina: Discipline) => {
    setSelectedCards(prevSelected => {
      const isSelected = prevSelected.some(d => d.CodDisciplina === disciplina.CodDisciplina);
      const newSelected = isSelected
        ? prevSelected.filter(d => d.CodDisciplina !== disciplina.CodDisciplina)
        : [...prevSelected, disciplina];
      logger.debug('Updated Selected Cards:', newSelected);
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

  if (loading) {
    return <div className="grid">Carregando dados...</div>;
  }

  return (
    <div className="grid" onDragOver={handleDragOver} onDrop={handleDrop}>
      {Object.keys(disciplinas).map(period => (
        <div key={period} className="column">
          {uniqueDisciplinas(disciplinas[period]).map((disciplina, index) => (
            <div
              key={index}
              className={`disciplineCard ${
                disciplina.Oferecida === 'N' ? 'not-offered' : ''
              } ${
                hoveredCode === disciplina.CodDisc ? 'hovered' : ''
              } ${
                hoveredCode !== disciplina.CodDisc && highlighted.includes(disciplina.CodDisc) ? 'highlight' : ''
              } ${draggedDiscipline && draggedDiscipline !== disciplina ? 'faded' : ''} ${
                selectedCards.some(d => d.CodDisciplina === disciplina.CodDisciplina) ? 'selected' : ''
              }`}
              draggable
              onDragStart={() => handleDragStart(disciplina)}
              onMouseEnter={() => handleMouseEnter(disciplina)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleCardClick(disciplina)}
            >
              <h5 className="disciplineCode">{disciplina.CodDisc}</h5>
              <h5 className="disciplineName">{disciplina.NomeDisciplina}</h5>
            </div>
          ))}
        </div>
      ))}
      {selectedCards.length >= 2 && (
        <div className="gridActionArea">
          <button 
            className="gridActionButton" 
            onClick={() => {
              // Preparar dados para Grade de Horários
              const scheduleData = selectedCards.map(disc => ({
                codigo: disc.CodDisc,
                codigoCompleto: disc.CodDisciplina,
                nome: disc.NomeDisciplina,
                periodo: disc.Periodo,
                creditos: disc.Creditos,
                horarios: disc.Horarios?.split('\n') || [],
                salas: disc.Sala?.split('\n') || [],
                turmasDisponiveis: disc.TurmasDisponiveis || { teoricas: [], praticas: [] }
              }));
              
              // Log estruturado para debug
              logger.debug('=== DADOS PARA GRADE DE HORÁRIOS ===');
              logger.debug('Total de disciplinas:', scheduleData.length);
              logger.debug('Dados:', scheduleData);
              
              // TODO: Implementar navegação para página de visualização
              // Opção 1: React Router
              // navigate('/grade-horarios', { state: { schedules: scheduleData } });
              
              // Opção 2: Context API / Global State
              // setGlobalSchedule(scheduleData);
              
              // Opção 3: LocalStorage (temporário)
              localStorage.setItem('gradeon:schedules', JSON.stringify(scheduleData));
              alert(`Dados salvos! ${scheduleData.length} disciplinas prontas para visualização.`);
            }}
          >
            Grade de Horários ({selectedCards.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default CourseGrid;