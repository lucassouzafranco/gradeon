import CourseGrid from "./components/CourseGrid/CourseGrid";
import Menu from "./components/Menu/Menu";
import Background from "./assets/background.jpg";
import "./App.css";
import DinamycArea from "./components/DinamycArea/DinamycArea";

function App() {
  return (
    <div className="appContainer">
      <Menu />
      <div className="courseGridContainer">
        <CourseGrid />
      </div>
      <DinamycArea />
      <img src={Background} alt="background" className="backgroundImage" />
    </div>
  );
}

export default App;
