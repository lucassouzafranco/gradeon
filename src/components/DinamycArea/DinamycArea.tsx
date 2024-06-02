import React from "react";
import './DinamycArea.css';
import SelectedCard from "../SelectedCard/SelectedCard";
import Overview from "../Overview/Overview";

const DinamycArea: React.FC = () => {
  return (
    <div className="dinamycAreaContainer">
      <SelectedCard />
      <Overview />
    </div>
  );
}

export default DinamycArea;