import React, { useState, useEffect } from "react";
import './SelectedCard.css';
import { Discipline } from "../../types/types";

const SelectedCard: React.FC<{ discipline: Discipline | null }> = ({ discipline }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); // Reinicia o estado de loading ao mudar a disciplina
    const timer = setTimeout(() => {
      setLoading(false);
    }, 210); // Delay de 2 segundos

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
              <span className="label">Código da Disciplina:</span>
              <div className="dataBox redMedium">{discipline.CodDisciplina}</div>
            </div>

            <div className="dataRow">
              <span className="label">Tipo:</span>
              <div className="dataBox redMedium">{discipline.Tipo}</div>
            </div>

            <div className="dataRow">
              <span className="label">Turma:</span>
              <div className="dataBox redMedium">{discipline.Turma}</div>
            </div>

            <div className="dataRow">
              <span className="label">Horários:</span>
              <div className="dataBox redMedium">{discipline.Horarios}</div>
            </div>

            <div className="dataRow">
              <span className="label">Sala:</span>
              <div className="dataBox redMedium">{discipline.Sala}</div>
            </div>

            <div className="dataRow">
              <span className="label">Período:</span>
              <div className="dataBox redMedium">{discipline.Periodo}</div>
            </div>

            <div className="dataRow">
              <span className="label">Nome da Disciplina:</span>
              <div className="dataBox redMedium">{discipline.NomeDisciplina}</div>
            </div>

            <div className="dataRow">
              <span className="label">Carga Semanal:</span>
              <div className="dataBox redMedium">{discipline.CargaSemanal}</div>
            </div>

            <div className="dataRow">
              <span className="label">Carga Total:</span>
              <div className="dataBox redMedium">{discipline.CargaTotal}</div>
            </div>
          </div>

          <div className="rightSide">
            <div className="dataRow">
              <span className="label">Dependências:</span>
              <div className="dataBox redMedium">{discipline.Dependencias}</div>
            </div>

            <div className="dataRow">
              <span className="label">Oferecida:</span>
              <div className="dataBox redMedium">{discipline.Oferecida}</div>
            </div>

            <div className="dataRow">
              <span className="label">Código da Disciplina:</span>
              <div className="dataBox redMedium">{discipline.CodDisc}</div>
            </div>

            <div className="dataRow">
              <span className="label">Dependências:</span>
              <div className="dataBox redMedium">{discipline.Depen}</div>
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
