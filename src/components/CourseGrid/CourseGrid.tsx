import React, { useLayoutEffect, useRef, useState } from 'react';
import { Discipline } from '../../types/types';
import { useCurso } from '../../data/CursoContext';
import { OptativasPainel, OptativasViewProps } from './OptativasViews';
import './CourseGrid.css';

interface CourseGridProps {
  setSelectedDiscipline: React.Dispatch<React.SetStateAction<Discipline | null>>;
  selectedCards: Discipline[];
  setSelectedCards: React.Dispatch<React.SetStateAction<Discipline[]>>;
  onNavigateToSchedule: () => void;
}

const CourseGrid: React.FC<CourseGridProps> = ({ setSelectedDiscipline, selectedCards, setSelectedCards, onNavigateToSchedule }) => {
  const { curso, dados } = useCurso();
  const disciplinas = dados?.courseData ?? {};
  // Só as optativas ofertadas no semestre (com turma na DTI): são as que dá para cursar e pôr na grade.
  const OPTATIVAS: Discipline[] = (dados?.optativas ?? []).filter(d => d.TurmasDisponiveis !== undefined);
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [draggedDiscipline, setDraggedDiscipline] = useState<Discipline | null>(null);
  const [optativasAbertas, setOptativasAbertas] = useState(false);

  // Escala do cartão em relação a SI: a maior entre ESCALA_MINIMA e 1 em que a coluna mais alta cabe.
  // Busca binária medida no DOM antes da pintura (useLayoutEffect), reiniciada a cada troca de dados.
  // `lo` sempre cabe (ou é o piso) e `hi` não cabe; converge em poucas iterações sem oscilar.
  const ESCALA_MINIMA = 0.72;
  // Abaixo desta escala o cartão normal (igual ao de SI) ficaria pequeno demais: a busca é refeita
  // em modo compacto (cartão mais largo e margens internas menores, CourseGrid.css), que costuma
  // devolver uma escala maior. Cursos que cabem acima do limiar mantêm o cartão normal.
  const LIMIAR_COMPACTO = 0.9;
  const columnsRef = useRef<HTMLDivElement>(null);
  const INICIO = { escala: 1, lo: ESCALA_MINIMA, hi: 1, pronto: false, compacto: false };
  const [ajuste, setAjuste] = useState(INICIO);
  useLayoutEffect(() => {
    const reiniciar = () => setAjuste(INICIO);
    reiniciar();
    // A fonte pode trocar depois da primeira medição (muda a quebra de linha) e a janela pode mudar de tamanho.
    document.fonts?.ready.then(reiniciar);
    window.addEventListener('resize', reiniciar);
    return () => window.removeEventListener('resize', reiniciar);
  }, [dados]);
  useLayoutEffect(() => {
    const el = columnsRef.current;
    if (!el || !dados || ajuste.pronto) return;
    // "Cabe" = o cartão mais baixo termina acima da faixa do botão, com folga de 2 px.
    // Medido por offsetTop/offsetHeight (ignora o transform de hover, que não afeta o layout).
    const limite = el.clientHeight - parseFloat(getComputedStyle(el).paddingBottom) - 2;
    const fundo = Math.max(0, ...Array.from(el.querySelectorAll<HTMLElement>('.disciplineCard')).map(c => c.offsetTop + c.offsetHeight));
    const cabe = fundo <= limite;
    if (cabe && ajuste.escala === 1) { setAjuste(a => ({ ...a, pronto: true })); return; }
    const lo = cabe ? ajuste.escala : ajuste.lo;
    const hi = cabe ? ajuste.hi : ajuste.escala;
    if (hi - lo <= 0.015) {
      // Intervalo fechado: fica no maior valor que comprovadamente coube (ou no piso).
      if (lo < LIMIAR_COMPACTO && !ajuste.compacto) {
        // Segundo estágio: repete a busca com o cartão compacto.
        setAjuste({ ...INICIO, compacto: true });
        return;
      }
      setAjuste({ ...ajuste, escala: lo, lo, hi, pronto: true });
      return;
    }
    setAjuste({ ...ajuste, escala: Math.round(((lo + hi) / 2) * 1000) / 1000, lo, hi, pronto: false });
  }, [ajuste, dados]);
  const escalaCartao = ajuste.escala;

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

  if (!dados) {
    return <div className="grid">Carregando {curso.nome}...</div>;
  }



  // Disciplina usada no tutorial: a primeira do período mais baixo que tem dependentes,
  // para que o hover acenda outras disciplinas na matriz.
  const tourCod = Object.keys(disciplinas)
    .sort((a, b) => Number(a) - Number(b))
    .flatMap(period => uniqueDisciplinas(disciplinas[period]))
    .find(d => (d.Dependentes?.length ?? 0) > 0)?.CodDisciplina;

  const optativasProps: OptativasViewProps = {
    optativas: OPTATIVAS,
    selectedCards,
    hoveredCode,
    highlighted,
    onHover: handleMouseEnter,
    onLeave: handleMouseLeave,
    onToggle: handleCardClick,
  };

  return (
    <div
      className="grid"
      style={{ ['--escala-cartao' as string]: escalaCartao } as React.CSSProperties}
      data-tour="matriz"
      data-compacto={ajuste.compacto ? 'true' : undefined}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="gridColumns" ref={columnsRef}>
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
              data-tour={disciplina.CodDisciplina === tourCod ? 'disciplina-alvo' : undefined}
              data-cod={disciplina.CodDisciplina === tourCod ? disciplina.CodDisciplina : undefined}
              draggable
              onDragStart={() => handleDragStart(disciplina)}
              onMouseEnter={() => handleMouseEnter(disciplina)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleCardClick(disciplina)}
            >
              <h5 className="disciplineCode">{disciplina.CodDisciplina}</h5>
              <h5 className="disciplineName">{disciplina.NomeDisciplina}</h5>
            </div>
          ))}
        </div>
      ))}
      </div>
      {optativasAbertas && <OptativasPainel {...optativasProps} onClose={() => setOptativasAbertas(false)} />}
      {/* Barra de ações: "Ver optativas" sempre visível; "Grade de Horários" a partir de 2 disciplinas. */}
      <div className="gridActionArea">
        {OPTATIVAS.length > 0 && !optativasAbertas && (
          <button type="button" className="gridActionButton" onClick={() => setOptativasAbertas(true)}>
            Ver Optativas ({OPTATIVAS.length})
          </button>
        )}
        {selectedCards.length >= 2 && (() => {
            const isOnlyPeriod1 = selectedCards.every(c => c.Periodo === 1);
            // Último período do curso (8 em SI, até 10 em outros cursos).
            const isOnlyPeriod8 = selectedCards.every(c => c.Periodo === curso.periodos);
            
            if (isOnlyPeriod1) {
              return <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', padding: '10px 20px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>Alunos ingressantes (1º período) possuem grade fixa predefinida pela instituição.</div>;
            }
            if (isOnlyPeriod8) {
              return <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', padding: '10px 20px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>No último período as atividades possuem horário flexível com o orientador, dispensando o cronograma.</div>;
            }

            return (
              <button
                data-tour="botao-grade"
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
                  
                  localStorage.setItem('gradeon:schedules', JSON.stringify(scheduleData));
                  onNavigateToSchedule();
                }}
              >
                Grade de Horários ({selectedCards.length})
              </button>
            );
          })()}
      </div>
    </div>
  );
};

export default CourseGrid;