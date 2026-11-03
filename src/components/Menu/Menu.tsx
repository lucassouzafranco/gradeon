import React from "react";
import "./Menu.css";
import { IoMenu } from "react-icons/io5";
import gradeon_logo from "../../assets/gradeon_logo.png";
import { FaUserCircle } from "react-icons/fa";

import { useNavigate } from "react-router-dom";
import { useCurso } from "../../data/CursoContext";
import { CURSOS } from "../../data/cursos";

interface MenuProps {
  isSchedulePage: boolean;
  /** Reabre o tutorial de uso. */
  onHelp: () => void;
}

const Menu: React.FC<MenuProps> = ({ isSchedulePage, onHelp }) => {
  const navigate = useNavigate();
  const { curso, setCursoId, anoCatalogo, anos, setAnoCatalogo, aviso } = useCurso();

  return (
    <div className="menuContainer">
      <div className="menuContent">
        <div className="menuAndLogo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <IoMenu />
          <img src={gradeon_logo} alt="logo do GRADEON" />
        </div>
        <div className="menuOptions">
          <label className="cursoSelector">
            <span className="cursoSelectorLabel">CURSO</span>
            <select
              value={curso.id}
              onChange={e => { setCursoId(e.target.value); navigate("/"); }}
              aria-label="Selecionar curso"
            >
              {CURSOS.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>
          <label className="cursoSelector">
            <span className="cursoSelectorLabel">CATÁLOGO</span>
            <select aria-label="Selecionar catálogo" value={anoCatalogo} onChange={e => setAnoCatalogo(Number(e.target.value))}>
              {anos.map(ano => <option key={ano} value={ano}>{ano}</option>)}
            </select>
          </label>
          {aviso && <span role="status">{aviso}</span>}
          <h5 style={{ cursor: "pointer" }} onClick={onHelp}>AJUDA</h5>
          <div className="loginContainer">
            <div className="loginIcon">
              <FaUserCircle />
            </div>
            <div className="loginName">Lucas Souza</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
