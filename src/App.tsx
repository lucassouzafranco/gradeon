import { useState, useEffect, useRef } from "react";
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
import { lerSessao, salvarSessao, lerTextoLegado } from './data/planejamento';
import { CURSO_PADRAO } from "./data/cursos";

function App() {
  const { chave, dados, erro, tentarNovamente } = useCurso();
  const [tutorialInicialExibido, setTutorialInicialExibido] = useState(false);
  const location = useLocation();
  useEffect(() => { if (dados) setTutorialInicialExibido(true); }, [dados]);
  if (!dados) return <><Menu isSchedulePage={false} onHelp={() => {}} /><div role={erro ? 'alert' : 'status'} style={{padding:40}}>{erro ?? 'Carregando catálogo…'}{erro && <button onClick={tentarNovamente}>Tentar novamente</button>}</div></>;
  return <Planejador key={chave} abrirTutorial={!tutorialInicialExibido && location.pathname === '/'} />;
}
function Planejador({ abrirTutorial }: { abrirTutorial: boolean }) {
  const { curso, dados, chave, anoCatalogo } = useCurso();
  const storageKey = 'gradeon:v2:disciplinas:' + chave;
  const disciplinas = [...Object.values(dados?.courseData ?? {}).flat(), ...(dados?.optativas ?? [])];
  const [avisoSelecao] = useState(() => {
    const salvo = lerSessao(storageKey);
    return Array.isArray(salvo) && salvo.some(c => !disciplinas.some(d => d.CodDisciplina === c)) ? 'Algumas disciplinas salvas não existem mais neste catálogo e foram removidas da seleção.' : '';
  });
  const recuperar = (): Discipline[] => {
    let salvo = lerSessao(storageKey);
    if (salvo === null && anoCatalogo === 2026 && lerTextoLegado('gradeon:curso') === curso.id) {
      const antigo = lerSessao('gradeon:selectedCards');
      if (Array.isArray(antigo)) salvo = antigo.map(d => typeof d === 'object' && d !== null && 'CodDisciplina' in d ? d.CodDisciplina : null);
    }
    return Array.isArray(salvo) ? disciplinas.filter((d,i,lista) => salvo.includes(d.CodDisciplina) && lista.findIndex(x => x.CodDisciplina === d.CodDisciplina) === i) : [];
  };
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const planoInicial = useRef<Discipline[] | null>(null);
  if (planoInicial.current === null) planoInicial.current = recuperar();
  const [tourActive, setTourActive] = useState(abrirTutorial);
  const [selectedCards, setSelectedCards] = useState<Discipline[]>(() => abrirTutorial ? [] : planoInicial.current ?? []);
  const selecaoAntesTour = useRef<Discipline[]>(planoInicial.current ?? []);
  const [tourDiscipline, setTourDiscipline] = useState<Discipline | null>(null);

  // Curso denso (7+ disciplinas em algum período ou 10 períodos): a matriz ganha altura dos painéis
  // de baixo, que encolhem na mesma proporção, para o cartão não precisar ficar tão pequeno.
  const maxPorPeriodo = Math.max(0, ...Object.values(dados?.courseData ?? {}).map(l => new Set(l.map(d => d.NomeDisciplina)).size));
  const layoutDenso = maxPorPeriodo >= 7 || curso.periodos >= 10;

  useEffect(() => {
    if (!tourActive) salvarSessao(storageKey, selectedCards.map(d => d.CodDisciplina));
  }, [selectedCards, tourActive, storageKey]);

  const isSchedulePage = location.pathname === "/grade";

  const startTour = () => {
    if (tourActive) return;
    selecaoAntesTour.current = selectedCards;
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
    // Ao sair da demonstração, recupera o planejamento anterior.
    setSelectedCards(selecaoAntesTour.current);
    setSelectedDiscipline(null);
  };

  // Durante o tutorial, o painel continua mostrando a disciplina do passo de hover depois que o mouse sai do cartão.
  const panelDiscipline = selectedDiscipline ?? (tourActive ? tourDiscipline : null);

  return (
    <div className={`appContainer ${layoutDenso ? "denso" : ""}`}>
      <Menu isSchedulePage={isSchedulePage} onHelp={startTour} />
      
      {avisoSelecao && <p role="status">{avisoSelecao}</p>}
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
