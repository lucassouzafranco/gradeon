import React, { useState, useEffect } from "react";
import './SelectedCard.css';
import { Discipline } from "../../types/types";
import { courseData } from "../../data/courseData";

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

const SelectedCard: React.FC<{ discipline: Discipline | null }> = ({ discipline }) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            setLoading(false);
        }, 240);

        return () => clearTimeout(timer);
    }, [discipline]);

    return (
        <div className="selectedCardContainer">
            {loading ? (
                <div>Carregando...</div> // Mensagem durante o carregamento
            ) : discipline ? (
                <div className="leftandRightSide">
                    <div className="theLeftSide">
                        <div className="dataRow">
                            <span className="label">Créditos:</span>
                            <div className={`dataBox ${
                                parseInt(discipline.CargaSemanal) <= 2 ? 'redDark' :
                                parseInt(discipline.CargaSemanal) === 4 ? 'redMedium' :
                                'redLight'
                            }`}>{discipline.CargaSemanal.split('(')[0]}</div>
                        </div>
                        <div className="dataRow">
                            <span className="label">Pré-requisitos:</span>
                            {(() => {
                                if (!discipline.Dependencias || discipline.Dependencias === "não possui") {
                                    return <span className="plainText">não possui</span>;
                                }
                                
                                const prerequisitosArray = discipline.Dependencias.split('|').map(p => p.trim());
                                
                                if (prerequisitosArray.length > 2) {
                                    return (
                                        <div className="dataBox redMedium turmaScrollBox">
                                            <ScrollingText items={prerequisitosArray} />
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="dataBox redMedium">
                                            {prerequisitosArray.join(' | ')}
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                        <div className="dataRow">
                            <span className="label">Turmas:</span>
                            {(() => {
                                const allTurmas = courseData[discipline.Periodo.toString()]?.filter(
                                    d => d.CodDisciplina === discipline.CodDisciplina && d.Tipo === 'T'
                                ) || [];
                                
                                if (allTurmas.length === 0) {
                                    return <span className="plainText">não informado</span>;
                                }
                                
                                const turmasTexts = allTurmas.map(turma => 
                                    `T${turma.Turma}: ${turma.Horarios.replace(/\|/g, ' | ')}h`
                                );
                                
                                if (allTurmas.length > 2) {
                                    return (
                                        <div className="dataBox dark turmaScrollBox">
                                            <ScrollingText items={turmasTexts} />
                                        </div>
                                    );
                                } else {
                                    return turmasTexts.map((text, index) => (
                                        <div key={index} className="dataBox dark">
                                            {text}
                                        </div>
                                    ));
                                }
                            })()}
                        </div>
                    </div>

                    <div className="theRightSide">
                        <div className="dataRow">
                            <span className="label">Reprovação:</span>
                            <div className="dataBox redMedium">
                                {discipline.reprovaPercentual !== undefined ? `${discipline.reprovaPercentual}%` : 'N/A'}
                            </div>
                        </div>
                        <div className="dataRow">
                            <span className="label">Oferta:</span>
                            <div className="dataBox dark">
                                {typeof discipline.Periodo === 'number' 
                                    ? (discipline.Periodo % 2 === 0 ? 'semestre par' : 'semestre ímpar')
                                    : discipline.Oferecida}
                            </div>
                        </div>
                        <div className="dataRow">
                            <span className="label">Dependentes:</span>
                            {(() => {
                                // Usar o campo Dependentes se existir, senão fallback para message
                                const dependentes = discipline.Dependentes || [];
                                
                                if (!dependentes || dependentes.length === 0) {
                                    return <span className="plainText">não possui</span>;
                                }
                                
                                if (dependentes.length > 2) {
                                    return (
                                        <div className="dataBox redMedium turmaScrollBox">
                                            <ScrollingText items={dependentes} />
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="dataBox redMedium">
                                            {dependentes.join(' | ')}
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                </div>

            ) : (
                <div>passe o mouse sobre as disciplinas e veja as informações aqui.</div> 
            )}
        </div>
    );
}

export default SelectedCard;
