import React, { Fragment } from "react";
import "./CourseGrid.css";

interface CourseData {
  CodDisciplina: string;
  NomeDisciplina: string;
  Tipo: string;
  Turma: string;
  Horarios: string;
  Sala: string;
  Periodo: number;
  CargaSemanal: string;
  CargaTotal: number;
  Oferecida: string;
  CodDisc: string;
  Depen: string;
}

interface CourseGridProps {
  data: CourseData[][];
}

const CourseGrid: React.FC = () => {
  const createArray = () => Array.from(Array(5))
  return (
    <Fragment>
    <div className="inputContainer">
      {/* Renders 6 lines of LetterBlocks */}
      {createArray().map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="row"> 
          {/* Renders 5 LetterBlocks per line */}
          {Array.from(Array(6)).map((_, colIndex) => (
            <input
              key={`row-${rowIndex}-col-${colIndex}`}
              type="text"
              readOnly
              className="letterBlocks"
            />
          ))}
        </div>
      ))}
    </div>
  </Fragment>
  );
}

export default CourseGrid;
