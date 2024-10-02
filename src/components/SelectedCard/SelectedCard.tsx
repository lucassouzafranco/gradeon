import React, { useState, useEffect } from "react";
import './SelectedCard.css';
import { Discipline } from "../../types/types";

const SelectedCard: React.FC<{ discipline: Discipline | null }> = ({ discipline }) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true); // Reinicia o estado de loading ao mudar a disciplina
        const timer = setTimeout(() => {
            setLoading(false);
        }, 240); // Delay de 240 milisegundos

        return () => clearTimeout(timer); // Limpa o timer ao desmontar o componente
    }, [discipline]);

    return (
        <div className="selectedCardContainer">
            {loading ? (
                <div>Carregando...</div> // Mensagem durante o carregamento
            ) : discipline ? (
                <div className="leftAndRightSide">
                    <div className="leftSide">
                        <div className="dataRow">
                            <span className="label">Créditos:</span>
                            <div className="dataBox redMedium">{discipline.CargaSemanal[0]}</div>
                        </div>
                        <div className="dataRow">
                            <span className="label">Pré-requisitos:</span>
                            <div className="dataBox redMedium">{discipline.Dependencias}</div>
                        </div>
                        <div className="dataRow">
                            <span className="label">Turmas:</span>
                            <div className="dataBox redMedium">T1</div>
                            <div className="dataBox redMedium">T2</div>
                        </div>
                    </div>

                    <div className="rightSide">
                        <div className="dataRow">
                            <span className="label">Reprovação:</span>
                            <div className="dataBox redMedium">34%</div>
                        </div>
                        <div className="dataRow">
                            <span className="label">Oferta:</span>
                            <div className="dataBox redMedium">{discipline.Oferecida}</div>
                        </div>
                        <div className="dataRow">
                            <span className="label">Dependentes:</span>
                            <div className="dataBox redMedium">{discipline.Dependencias}</div>
                        </div>
                    </div>
                </div>

            ) : (
                <div>Nenhuma disciplina selecionada.</div> // Mensagem se disciplina for null
            )}
        </div>
    );
}

export default SelectedCard;
