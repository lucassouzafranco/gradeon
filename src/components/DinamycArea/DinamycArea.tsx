import React from "react";
import './DinamycArea.css';
import SelectedCard from "../SelectedCard/SelectedCard";
import Overview from "../Overview/Overview";
import { Discipline } from "../../types/types";

interface DinamycAreaProps {
  selectedDiscipline: Discipline | null;
}

const DinamycArea: React.FC<DinamycAreaProps> = ({ selectedDiscipline }) => {
  return (
    <div className="dinamycAreaContainer">
      <SelectedCard discipline={selectedDiscipline} />
      <Overview />
    </div>
  );
}

export default DinamycArea;
