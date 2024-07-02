import React from "react";
import './SelectedCard.css';

const SelectedCard: React.FC = () => {
  return (
    <div className="selectedCardContainer">
      <div className='disciplineTitle'>SIN 222 - FUNDAMENTOS DOS SISTEMAS DE INFORMAÇÃO</div>
      <div className="leftAndRightSide">

        <div className="leftSide">
          <div className="dataRow">
            <span className="label">Créditos:</span>
            <div className="dataBox redMedium">6</div>
          </div>

          <div className="dataRow">
            <span className="label">Pré-requisitos:</span>
            <div className="dataBox dataBox-variant redDark">SIN 000</div>
            <div className="dataBox dataBox-variant redDark">SIN 000</div>
          </div>

          <div className="dataRow">
            <span className="label">Horários:</span>
            <div className="dataBox dataBox-variant redMedium">2 - 14h | 4 - 16h</div>
          </div>
        </div>

        <div className="rightSide">
          <div className="dataRow">
            <span className="label">Reprovação:</span>
            <div className="dataBox redDark">34%</div>
          </div>

          <div className="dataRow">
            <span className="label">Oferta:</span>
            <div className="dataBox dataBox-variant redDark">período par</div>
          </div>

          <div className="dataRow">
            <span className="label">Dependentes:</span>
            <div className="dataBox dataBox-variant redMedium">não possui</div>
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default SelectedCard;
