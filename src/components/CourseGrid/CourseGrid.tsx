import React, { useState, useEffect } from 'react';
import { Discipline } from '../../types/types';
import { getCourseData, getUnifiedCourseData } from '../../data';
import './CourseGrid.css';

interface CourseGridProps {
  setSelectedDiscipline: React.Dispatch<React.SetStateAction<Discipline | null>>;
  selectedCards: Discipline[];
  setSelectedCards: React.Dispatch<React.SetStateAction<Discipline[]>>;
}

const CourseGrid: React.FC<CourseGridProps> = ({ setSelectedDiscipline, selectedCards, setSelectedCards }) => {
  const [disciplinas, setDisciplinas] = useState<Record<string, Discipline[]>>({});
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [draggedDiscipline, setDraggedDiscipline] = useState<Discipline | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await getUnifiedCourseData();
        setDisciplinas(result.courseData);
      } catch (error) {
        try {
          const data = await getCourseData();
          setDisciplinas(data);
        } catch (fallbackError) {
          // Sem logs no browser; falha total permanece silenciosa.
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
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

  const handleMouseEnter = (disciplina: Discipline) => {
    // Marcar a disciplina atual como hovered
    setHoveredCode(disciplina.CodDisc);
    
    // Coletar códigos de pré-requisitos e dependentes para destacar
    const codesToHighlight: string[] = [];
    
    // Adicionar pré-requisitos (normalizar removendo espaços)
    if (disciplina.Prerequisitos && disciplina.Prerequisitos.length > 0) {
      disciplina.Prerequisitos.forEach(prereq => {
        codesToHighlight.push(prereq.replace(/\s+/g, ''));
      });
    }
    
    // Adicionar dependentes (normalizar removendo espaços)
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
              console.log('=== DADOS PARA GRADE DE HORÁRIOS ===');
              console.log('Total de disciplinas:', scheduleData.length);
              console.log('Dados:', scheduleData);
              
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