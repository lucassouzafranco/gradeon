import React, { useEffect, useState } from 'react';
import './Overview.css';
import { Discipline } from '../../types/types';
import { courseData } from '../../data/courseData';

interface OverviewProps {
  selectedCards: Discipline[];
}

const ScrollingText: React.FC<{ items: string[] }> = ({ items }) => {
  const text = items.join('     |     ');
  const textLength = text.length;
  const animationDuration = Math.max(10, textLength * 0.3);
  
  return (
    <div className="scrollingContainer">
      <div className="scrollingContent" style={{ animationDuration: `${animationDuration}s` }}>
        <span>{text}</span>
        <span>{text}</span>
      </div>
    </div>
  );
};

const Overview: React.FC<OverviewProps> = ({ selectedCards }) => {
  const [balanceamento, setBalanceamento] = useState<number | string>('');
  
  useEffect(() => {
    console.log('Selected Cards:', selectedCards);
  }, [selectedCards]);

  const totalCredits = selectedCards.reduce((sum, card) => sum + parseInt(card.CargaSemanal.split('(')[0]), 0);
  const numDisciplinas = selectedCards.length;

  // Verificação de disciplinas de 6 créditos
  const numDisciplinas6Credits = selectedCards.filter(card => parseInt(card.CargaSemanal.split('(')[0]) === 6).length;

  // Futura implementação: Porcentagem média de reprovação
  // Quando os dados de reprovação estiverem disponíveis, podemos calcular a média das porcentagens de reprovação das disciplinas selecionadas.
  // Vamos adicionar isso à fórmula do balanceamento da grade.
  const averageReprovaPercentage = selectedCards.reduce((sum, card) => sum + (card.reprovaPercentual || 0), 0) / selectedCards.length;
  
  // Balanceamento ajustado para considerar disciplinas de 6 créditos
  let balanceamentoDaGrade: string | number = '';
  if (numDisciplinas > 2 && numDisciplinas < 7) {
    // Adicionando a porcentagem de reprovação na fórmula de balanceamento
    // Essa parte da fórmula será ajustada assim que tivermos os dados de reprovação.
    balanceamentoDaGrade = (totalCredits / (numDisciplinas * 4)) * (1 + averageReprovaPercentage / 100); // Ajuste baseado na média da taxa de reprovação
  } else if (numDisciplinas >= 7 || numDisciplinas6Credits >= 2) {
    balanceamentoDaGrade = 'Desbalanceada'; // Se houver duas ou mais disciplinas de 6 créditos, a grade é desbalanceada
  }

  // Classificação ajustada para refletir a natureza dos dados
  const gradeClassification = (balance: any) => {
    if (balance === '') return ''; // Para poucas disciplinas ou vazio
    if (balance === 'Desbalanceada') return 'Desbalanceada'; // Para 7 ou mais disciplinas, ou mais de uma disciplina de 6 créditos
    if (balance < 0.75) return 'Desbalanceada'; // Menos que 0.75 é desbalanceado
    if (balance <= 1.25) return 'Balanceada'; // Entre 0.75 e 1.25 é balanceada
    if (balance <= 1.50) return 'Levemente Desbalanceada'; // Entre 1.25 e 1.50 é levemente desbalanceada
    return 'Desbalanceada'; // Acima de 1.50 é desbalanceada
  };

  const classification = gradeClassification(balanceamentoDaGrade);

  // Salvar o número de créditos em algum lugar
  const savedCredits = balanceamentoDaGrade !== 'Desbalanceada' ? totalCredits : undefined;

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
      .flatMap(card => card.Sala ? card.Sala.split('\n') : [])
      .map(sala => sala.trim())
      .filter(sala => sala !== '')
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
                <span className="label">Balanceamento da grade:</span>
                <div className="dataBox redMedium narrowBox">
                  {numDisciplinas < 3 ? 'requer 3+ disciplinas' : classification}
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
                  {sortedShifts.length > 0 ? (
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
