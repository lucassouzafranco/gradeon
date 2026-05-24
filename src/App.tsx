import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import CourseGrid from "./components/CourseGrid/CourseGrid";
import Menu from "./components/Menu/Menu";
import Background from "./assets/background.jpg";
import "./App.css";
import DinamycArea from "./components/DinamycArea/DinamycArea";
import ScheduleBuilder from "./components/ScheduleBuilder/ScheduleBuilder";
import { Discipline } from "./types/types";

function App() {
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const [selectedCards, setSelectedCards] = useState<Discipline[]>(() => {
    const saved = sessionStorage.getItem("gradeon:selectedCards");
    return saved ? JSON.parse(saved) : [];
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    sessionStorage.setItem("gradeon:selectedCards", JSON.stringify(selectedCards));
  }, [selectedCards]);

  const isSchedulePage = location.pathname === "/grade";

  return (
    <div className="appContainer">
      <Menu isSchedulePage={isSchedulePage} />
      
      <Routes>
        <Route path="/" element={
          <>
            <div className="courseGridContainer">
              <CourseGrid
                setSelectedDiscipline={setSelectedDiscipline}
                selectedCards={selectedCards}
                setSelectedCards={setSelectedCards}
                onNavigateToSchedule={() => navigate("/grade")}
              />
            </div>
            <DinamycArea selectedDiscipline={selectedDiscipline} selectedCards={selectedCards} />
          </>
        } />
        
        <Route path="/grade" element={
          <ScheduleBuilder
            selectedCards={selectedCards}
            onBack={() => navigate("/")}
          />
        } />
      </Routes>

      <img src={Background} alt="background" className="backgroundImage" />
    </div>
  );
}

export default App;