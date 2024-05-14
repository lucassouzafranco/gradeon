import CourseGrid from "./components/CourseGrid/CourseGrid";
import Menu from "./components/Menu/Menu";
import Background from "./assets/background.jpg";
import "./App.css";

function App() {
  return (
    <div id="appContainer"> {/* Adicione uma div para envolver todo o conteúdo */}
      <Menu />
      <CourseGrid />
      <img src={Background} alt="background" className="backgroundImage" />
    </div>
  );
}

export default App;
