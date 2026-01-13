import React, { useState, useEffect } from "react";
import './SelectedCard.css';
import { Discipline } from "../../types/types";
import { courseData } from "../../data/courseData";

const SelectedCard: React.FC<{ discipline: Discipline | null }> = ({ discipline }) => {
    const [loading, setLoading] = useState(true);
    const [currentTurmaIndex, setCurrentTurmaIndex] = useState(0);

    useEffect(() => {
        setLoading(true); // Reinicia o estado de loading ao mudar a disciplina
        const timer = setTimeout(() => {
            setLoading(false);
        }, 240); // Delay de 240 milisegundos

        return () => clearTimeout(timer); // Limpa o timer ao desmontar o componente
    }, [discipline]);

    // Rotaciona turmas quando houver mais de 2
    useEffect(() => {
        if (!discipline) return;
        
        const allTurmas = courseData[discipline.Periodo.toString()]?.filter(
            d => d.CodDisciplina === discipline.CodDisciplina && d.Tipo === 'T'
        ) || [];
        
        if (allTurmas.length > 2) {
            const interval = setInterval(() => {
                setCurrentTurmaIndex(prev => (prev + 1) % allTurmas.length);
            }, 2500); // Troca a cada 2.5 segundos
            
            return () => clearInterval(interval);
        } else {
            setCurrentTurmaIndex(0);
        }
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
                            {discipline.Dependencias && discipline.Dependencias !== "não possui" ? (
                                <div className="dataBox redMedium">{discipline.Dependencias.replace(/\|/g, ' | ')}</div>
                            ) : (
                                <span className="plainText">não possui</span>
                            )}
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
                                
                                if (allTurmas.length > 2) {
                                    // Exibe apenas uma turma por vez com animação
                                    const currentTurma = allTurmas[currentTurmaIndex];
                                    return (
                                        <div key={currentTurmaIndex} className="dataBox dark turmaSlide">
                                            T{currentTurma.Turma}: {currentTurma.Horarios.replace(/\|/g, ' | ')}h
                                        </div>
                                    );
                                } else {
                                    // Exibe todas as turmas quando houver 2 ou menos
                                    return allTurmas.map((turma, index) => (
                                        <div key={index} className="dataBox dark">
                                            T{turma.Turma}: {turma.Horarios.replace(/\|/g, ' | ')}h
                                        </div>
                                    ));
                                }
                            })()}
                        </div>
                    </div>

                    <div className="theRightSide">
                        <div className="dataRow">
                            <span className="label">Reprovação:</span>
                            <div className="dataBox redMedium">34%</div>
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
                            {discipline.Dependencias && discipline.Dependencias !== "não possui" ? (
                                <div className="dataBox redMedium">{discipline.Dependencias.replace(/\|/g, ' | ')}</div>
                            ) : (
                                <span className="plainText">não possui</span>
                            )}
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
