import CourseGrid from "./components/CourseGrid/CourseGrid";
import Menu from "./components/Menu/Menu";
import Background from "./assets/background.jpg";
import "./App.css";

function App() {
  return (
    <div className="appContainer">
      <Menu />
      <div className="courseGridContainer">
        <CourseGrid />
      </div>
      <img src={Background} alt="background" className="backgroundImage" />
    </div>
  );
}

export default App;
