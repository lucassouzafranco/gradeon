import React, { useState } from 'react';
import './Overview.css';
import { Discipline } from '../../types/types';
import ScrollingText from '../ScrollingText/ScrollingText';
import { useCourseData } from '../../data';
import { calcularBalanceamentoGrade, getCorPorValor } from '../../data/gradeBalance';

interface OverviewProps {
  selectedCards: Discipline[];
}

const Overview: React.FC<OverviewProps> = ({ selectedCards }) => {
  const { data: courseData, loading: courseLoading, gradeBalance } = useCourseData();

  const totalCredits = selectedCards.reduce((sum, card) => sum + parseInt(card.CargaSemanal.split('(')[0]), 0);
  const numDisciplinas = selectedCards.length;

  // Usar os indicadores calculados globalmente para toda a grade
  const iadg = gradeBalance?.iadg ?? 0;
  const ibg = gradeBalance?.ibg ?? 0;
  const classificacaoIADG = gradeBalance?.classificacaoIADG ?? '';
  const classificacaoIBG = gradeBalance?.classificacaoIBG ?? '';
  const interpretacao = gradeBalance?.interpretacao ?? '';
  
  // Cores baseadas nos indicadores
  const corIADG = getCorPorValor(iadg, 'dificuldade');
  const corIBG = getCorPorValor(ibg, 'dificuldade');

  const getShift = (time: number) => {
    if (time >= 6 && time < 12) return 'Manhã';
    if (time >= 12 && time < 18) return 'Tarde';
    if (time >= 18 && time <= 24) return 'Noite';
    return 'Desconhecido';
  };

  // Buscar todas as turmas disponíveis das disciplinas selecionadas
  const availableShifts = selectedCards.reduce((acc, card) => {
    // Buscar todas as turmas dessa disciplina
    const allTurmas = courseData[card.Periodo.toString()]?.filter(
      d => d.CodDisciplina === card.CodDisciplina && d.Tipo === 'T'
    ) || [];

    // Para cada turma, extrair os horários
    allTurmas.forEach(turma => {
      if (turma.Horarios) {
        const horarios = turma.Horarios.split('|').map(horario => parseInt(horario.split('=')[1]));
        const shifts = horarios.map(getShift);
        shifts.forEach(shift => {
          if (!acc.includes(shift) && shift !== 'Desconhecido') {
            acc.push(shift);
          }
        });
      }
    });

    return acc;
  }, [] as string[]);

  // Ordenar turnos: Manhã, Tarde, Noite
  const shiftOrder = ['Manhã', 'Tarde', 'Noite'];
  const sortedShifts = availableShifts.sort((a, b) => 
    shiftOrder.indexOf(a) - shiftOrder.indexOf(b)
  );

  // Extrair locais únicos (salas)
  const uniqueLocations = Array.from(new Set(
    selectedCards
      .map(card => card.Sala)
      .filter(sala => sala && sala.trim() !== '')
  )).sort();

  // Extrair códigos únicos das disciplinas
  const uniqueCodes = Array.from(new Set(
    selectedCards.map(card => card.CodDisciplina)
  )).sort();

  const conflictsToSolve = 0;

  return (
    <div className="overviewContainer">
      {selectedCards.length > 0 ? (
        <div className="overviewDetails">
          <div className="leftAndRight">
            <div className="leftSide">
              <div className="dataRow">
                <span className="label">Adequação de Dificuldade (IADG):</span>
                <div 
                  className="dataBox narrowBox" 
                  style={{ backgroundColor: corIADG, color: '#fff' }}
                  title={interpretacao}
                >
                  {classificacaoIADG}
                </div>
              </div>
              <div className="dataRow">
                <span className="label">Balanceamento (IBG):</span>
                <div 
                  className="dataBox narrowBox" 
                  style={{ backgroundColor: corIBG, color: '#fff' }}
                  title={interpretacao}
                >
                  {classificacaoIBG}
                </div>
              </div>
              <div className="dataRow">
                <span className="label">Número de disciplinas:</span>
                <div className="dataBox redMedium">{selectedCards.length}</div>
              </div>
              <div className="dataRow">
                <span className="label">Número de créditos:</span>
                <div className="dataBox redMedium">{totalCredits}</div>
              </div>
            </div>
            <div className="rightSide">
              <div className="dataRow">
                <span className="label">Locais:</span>
                <div className="dataBox redMedium wideBox">
                  {uniqueLocations.length > 0 ? (
                    uniqueLocations.length > 2 ? (
                      <ScrollingText items={uniqueLocations} />
                    ) : (
                      uniqueLocations.join(' | ')
                    )
                  ) : (
                    'N/A'
                  )}
                </div>
              </div>
              <div className="dataRow">
                <span className="label">Códigos:</span>
                <div className="dataBox redMedium wideBox">
                  {uniqueCodes.length > 2 ? (
                    <ScrollingText items={uniqueCodes} />
                  ) : (
                    uniqueCodes.join(' | ')
                  )}
                </div>
              </div>
              <div className="dataRow">
                <span className="label">Turnos disponíveis:</span>
                <div className="dataBox redMedium">
                  {!courseLoading && sortedShifts.length > 0 ? (
                    sortedShifts.length > 2 ? (
                      <ScrollingText items={sortedShifts} />
                    ) : (
                      sortedShifts.join(' | ')
                    )
                  ) : (
                    'N/A'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>clique nas disciplinas e analise sua grade aqui</div>
      )}
    </div>
  );
}

export default Overview;
