import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import CourseGrid from "./components/CourseGrid/CourseGrid";
import Menu from "./components/Menu/Menu";
import Background from "./assets/background.jpg";
import "./App.css";
import DinamycArea from "./components/DinamycArea/DinamycArea";
import ScheduleBuilder from "./components/ScheduleBuilder/ScheduleBuilder";
import Onboarding from "./components/Onboarding/Onboarding";
import { Discipline } from "./types/types";
import { useCurso } from "./data/CursoContext";
import { CURSO_PADRAO } from "./data/cursos";

function App() {
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Tutorial abre a cada carregamento da home (cada pessoa da demonstração começa do zero); o botão AJUDA reabre.
  const [tourActive, setTourActive] = useState(() => location.pathname === "/");
  const [selectedCards, setSelectedCards] = useState<Discipline[]>(() => {
    // Com o tutorial abrindo, a seleção salva é descartada para o passo de clique sempre adicionar a disciplina.
    if (location.pathname === "/") return [];
    const saved = sessionStorage.getItem("gradeon:selectedCards");
    return saved ? JSON.parse(saved) : [];
  });
  const [tourDiscipline, setTourDiscipline] = useState<Discipline | null>(null);
  const { curso, dados } = useCurso();

  // Curso denso (7+ disciplinas em algum período ou 10 períodos): a matriz ganha altura dos painéis
  // de baixo, que encolhem na mesma proporção, para o cartão não precisar ficar tão pequeno.
  const maxPorPeriodo = Math.max(0, ...Object.values(dados?.courseData ?? {}).map(l => new Set(l.map(d => d.NomeDisciplina)).size));
  const layoutDenso = maxPorPeriodo >= 7 || curso.periodos >= 10;

  // Trocar de curso zera a seleção: disciplinas e turmas de um curso não valem no outro.
  const [cursoAnterior, setCursoAnterior] = useState(curso.id);
  if (curso.id !== cursoAnterior) {
    setCursoAnterior(curso.id);
    setSelectedCards([]);
    setSelectedDiscipline(null);
    sessionStorage.removeItem("gradeon:selectedTurmas");
  }

  useEffect(() => {
    sessionStorage.setItem("gradeon:selectedCards", JSON.stringify(selectedCards));
  }, [selectedCards]);

  const isSchedulePage = location.pathname === "/grade";

  const startTour = () => {
    // O tutorial parte de uma seleção vazia para que o clique na disciplina-alvo sempre a adicione.
    setSelectedCards([]);
    setSelectedDiscipline(null);
    setTourDiscipline(null);
    navigate("/");
    setTourActive(true);
  };

  const finishTour = () => {
    setTourActive(false);
    setTourDiscipline(null);
    // A seleção feita durante o tutorial era só demonstração: a pessoa começa a própria grade do zero.
    setSelectedCards([]);
    setSelectedDiscipline(null);
  };

  // Durante o tutorial, o painel continua mostrando a disciplina do passo de hover depois que o mouse sai do cartão.
  const panelDiscipline = selectedDiscipline ?? (tourActive ? tourDiscipline : null);

  return (
    <div className={`appContainer ${layoutDenso ? "denso" : ""}`}>
      <Menu isSchedulePage={isSchedulePage} onHelp={startTour} />
      
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
            <DinamycArea selectedDiscipline={panelDiscipline} selectedCards={selectedCards} />
            {tourActive && (
              <Onboarding
                selectedDiscipline={selectedDiscipline}
                selectedCards={selectedCards}
                onPinDiscipline={setTourDiscipline}
                onFinish={finishTour}
                comBalanceamento={curso.id === CURSO_PADRAO}
              />
            )}
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