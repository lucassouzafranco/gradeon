import React, { useEffect, useState } from 'react';
import './Overview.css';
import { Discipline } from '../../types/types';
import { courseData, courseMetadata } from '../../data/courseData';

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

    const fallbackGlobal = courseMetadata?.medianaGlobalReprovacao || 20.2;

    // media com fallback pra materias novas
    const totalReprova = selectedCards.reduce((sum, card) => {
        const taxa = (card.reprovaPercentual !== null && card.reprovaPercentual !== undefined) 
            ? card.reprovaPercentual 
            : fallbackGlobal;
        return sum + taxa;
    }, 0);
    
    const averageReprovaPercentage = numDisciplinas > 0 
        ? totalReprova / numDisciplinas 
        : 0;

    // Identifica se todas as disciplinas selecionadas são de um único período
    const firstPeriod = selectedCards[0]?.Periodo?.toString();
    const isSinglePeriod = selectedCards.length > 0 && selectedCards.every(c => c.Periodo?.toString() === firstPeriod);
    
    // Obtém as disciplinas únicas previstas para este período no curso
    const periodDisciplines = firstPeriod ? (courseData[firstPeriod] || []) : [];
    const uniquePeriodDisciplines = periodDisciplines.filter((disc, idx, self) =>
        self.findIndex(d => d.NomeDisciplina === disc.NomeDisciplina) === idx
    );
    
    // É uma Grade Regular se todas as disciplinas do período selecionado foram escolhidas, sem outras misturadas
    const isRegularGrid = isSinglePeriod && 
                          selectedCards.length > 0 && 
                          selectedCards.length === uniquePeriodDisciplines.length;

    // Balanceamento da grade horária
    let balanceamentoDaGrade: string | number = '';
    
    if (isRegularGrid) {
        // Ignora a equação matemática para qualquer grade regular completa (prescrita pela instituição)
    } else if (numDisciplinas > 2 && numDisciplinas < 7) {
        // Identifica disciplinas "amortecedoras" (reprovação < 15%) que aliviam a pressão do semestre
        const numTranquilas = selectedCards.filter(card => {
            const taxa = (card.reprovaPercentual !== null && card.reprovaPercentual !== undefined)
                ? card.reprovaPercentual
                : fallbackGlobal;
            return taxa < 15.0;
        }).length;
        const discount = 1 - numTranquilas * 0.04;
        
        // Coeficiente normalizado pela carga horária absoluta de um semestre padrão (20 créditos), atenuado pelas matérias amortecedoras
        balanceamentoDaGrade = ((totalCredits / 20) * (1 + averageReprovaPercentage / 100)) * discount;
    } else if (numDisciplinas >= 7) {
        // Limite físico de disciplinas
        balanceamentoDaGrade = 'Desbalanceada';
    }

    // Classificação ajustada para refletir a natureza dos dados acadêmicos de forma estritamente formal e intuitiva
    const gradeClassification = (balance: any) => {
        if (isRegularGrid) return 'Grade Regular';
        if (balance === '') return ''; // Para poucas disciplinas ou vazio
        
        let classification = '';
        if (balance === 'Desbalanceada') {
            classification = 'Sobrecarga Severa';
        } else if (balance < 0.75) {
            classification = 'Carga Reduzida';
        } else if (balance <= 1.25) {
            classification = 'Grade Balanceada';
        } else if (balance <= 1.50) {
            classification = 'Carga Elevada';
        } else {
            classification = 'Sobrecarga Severa';
        }

        // Amortecimento de limite físico: com apenas 3 disciplinas selecionadas,
        // o volume absoluto de aulas e exames é reduzido, sendo impossível configurar uma "Sobrecarga Severa".
        if (numDisciplinas <= 3 && classification === 'Sobrecarga Severa') {
            return 'Carga Elevada';
        }

        return classification;
    };

    const classification = gradeClassification(balanceamentoDaGrade);

    const getSeverityClass = (status: string) => {
        if (status === 'Carga Reduzida') return 'severity-low';
        if (status === 'Grade Balanceada' || status === 'Grade Regular') return 'severity-medium';
        if (status === 'Carga Elevada') return 'severity-high';
        if (status === 'Sobrecarga Severa') return 'severity-critical';
        return 'severity-low';
    };

    const getShiftLabel = (hour: number) => {
        if (hour >= 6 && hour < 12) return 'Manhã';
        if (hour >= 12 && hour < 18) return 'Tarde';
        return 'Noite';
    };

    const availableShifts = selectedCards.reduce((acc, card) => {
        const allTurmas = courseData[card.Periodo.toString()]?.filter(
            d => d.CodDisciplina === card.CodDisciplina && d.Tipo === 'T'
        ) || [];

        allTurmas.forEach(turma => {
            if (turma.Horarios) {
                const slots = turma.Horarios.split(/[\n\s|]+/).filter(Boolean);
                slots.forEach(slot => {
                    const parts = slot.split('=');
                    if (parts.length === 2) {
                        const timeRange = parts[1].split('-');
                        if (timeRange.length > 0) {
                            const startHour = parseInt(timeRange[0].split(':')[0], 10);
                            if (!isNaN(startHour)) {
                                const shift = getShiftLabel(startHour);
                                if (!acc.includes(shift)) {
                                    acc.push(shift);
                                }
                            }
                        }
                    }
                });
            }
        });

        return acc;
    }, [] as string[]);

    const shiftOrder = ['Manhã', 'Tarde', 'Noite'];
    const sortedShifts = availableShifts.sort((a, b) =>
        shiftOrder.indexOf(a) - shiftOrder.indexOf(b)
    );

    const uniqueLocations = Array.from(new Set(
        selectedCards
            .flatMap(card => card.Sala ? card.Sala.split(/[\n|]+/) : [])
            .map(sala => sala.trim())
            .filter(sala => sala !== '')
    )).sort();

    const uniqueCodes = Array.from(new Set(
        selectedCards.map(card => card.CodDisciplina)
    )).sort();

    const getPedagogicalDescription = (status: string) => {
        switch (status) {
            case 'Grade Regular':
                return 'Excelente escolha! Cursar as disciplinas prescritas para o período regular mantém o discente no fluxo recomendado pela instituição, reduzindo o risco de retenção acadêmica futura.';
            case 'Carga Reduzida':
                return 'Semestre com carga de esforço leve. É ideal se você estiver realizando estágios exigentes, trabalhando, focado em projetos de extensão/iniciação científica, ou revisando matérias trancadas.';
            case 'Grade Balanceada':
                return 'Combinação ideal! A distribuição de disciplinas com diferentes perfis de retenção histórica atinge o ponto de equilíbrio perfeito (equivalente a 20 créditos padrão). Permite aprendizado sólido com ritmo de estudos saudável.';
            case 'Carga Elevada':
                return 'Atenção! Carga acadêmica densa e exigente. Este semestre demandará alto nível de dedicação aos estudos. É recomendado intercalar componentes curriculares com maiores taxas de retenção com disciplinas amortecedoras para atenuar o desgaste.';
            case 'Sobrecarga Severa':
                return 'Cuidado crítico! Risco elevado de trancamento e múltiplas reprovações. A combinação de alta carga horária com disciplinas de altíssima retenção acadêmica pode se tornar insustentável. Considere trocar disciplinas de alta retenção por disciplinas amortecedoras (com reprovação < 15%).';
            case 'Poucas Disciplinas':
                return 'Selecione pelo menos 3 disciplinas para que a análise matemática e pedagógica de esforço do semestre seja ativada de forma consistente.';
            default:
                return 'Selecione disciplinas para analisar o balanço de esforço pedagógico do seu semestre.';
        }
    };

    return (
        <div className="overviewContainer">
            {selectedCards.length > 0 ? (
                <div className="overviewDetails">
                    <div className="leftAndRight">
                        <div className="leftSide">
                            <div className="dataRow" style={{ position: 'relative' }}>
                                <span className="label">Balanceamento da grade:</span>
                                <div 
                                    className={`dataBox narrowBox ${getSeverityClass(isRegularGrid ? 'Grade Regular' : (numDisciplinas < 3 ? '' : classification))}`}
                                    style={{ position: 'relative' }}
                                >
                                    {isRegularGrid ? 'Grade Regular' : (numDisciplinas < 3 ? 'requer 3+ disciplinas' : classification)}
                                    
                                    <div className="pedagogicalTooltip">
                                        <div className="tooltipHeader">Orientação Pedagógica</div>
                                        <div className="tooltipMath">
                                            <strong>Modelo:</strong> Carga = (Créditos / 20) × (1 + % Reprovação Média / 100) × (1 - 4% × N<sub>amortecedoras</sub>)
                                        </div>
                                        <div className="tooltipDivider" />
                                        <div className="tooltipContent">
                                            {getPedagogicalDescription(isRegularGrid ? 'Grade Regular' : (numDisciplinas < 3 ? 'Poucas Disciplinas' : classification))}
                                        </div>
                                    </div>
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
