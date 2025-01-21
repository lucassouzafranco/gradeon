import React from "react";
import './DinamycArea.css';
import SelectedCard from "../SelectedCard/SelectedCard";
import Overview from "../Overview/Overview";
import { Discipline } from "../../types/types";

interface DinamycAreaProps {
  selectedDiscipline: Discipline | null;
  selectedCards: Discipline[];
}

const DinamycArea: React.FC<DinamycAreaProps> = ({ selectedDiscipline, selectedCards }) => {
  return (
    <div className="dinamycAreaContainer">
      <SelectedCard discipline={selectedDiscipline} />
      <Overview selectedCards={selectedCards} />
    </div>
  );
}

export default DinamycArea;