import React from "react";
import { useState } from "react";
import CourseGrid from "./components/CourseGrid/CourseGrid";
import Menu from "./components/Menu/Menu";
import Background from "./assets/background.jpg";
import "./App.css";
import DinamycArea from "./components/DinamycArea/DinamycArea";
import { Discipline } from "./types/types";

function App() {
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const [selectedCards, setSelectedCards] = useState<Discipline[]>([]);

  return (
    <div className="appContainer">
      <Menu />
      <div className="courseGridContainer">
        <CourseGrid
          setSelectedDiscipline={setSelectedDiscipline}
          selectedCards={selectedCards}
          setSelectedCards={setSelectedCards}
        />
      </div>
      <DinamycArea selectedDiscipline={selectedDiscipline} selectedCards={selectedCards} />
      <img src={Background} alt="background" className="backgroundImage" />
    </div>
  );
}

export default App;