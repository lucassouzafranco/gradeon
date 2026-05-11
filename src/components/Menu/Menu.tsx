import React from "react";
import "./Menu.css";
import { IoMenu } from "react-icons/io5";
import gradeon_logo from "../../assets/gradeon_logo.png";
import { FaUserCircle } from "react-icons/fa";

import { useNavigate } from "react-router-dom";

interface MenuProps {
  isSchedulePage: boolean;
}

const Menu: React.FC<MenuProps> = ({ isSchedulePage }) => {
  const navigate = useNavigate();

  return (
    <div className="menuContainer">
      <div className="menuContent">
        <div className="menuAndLogo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <IoMenu />
          <img src={gradeon_logo} alt="logo do GRADEON" />
        </div>
        <div className="menuOptions">
          {isSchedulePage && (
            <h5 style={{ cursor: "pointer" }}>OPTATIVAS E FACULTATIVAS</h5>
          )}
          <h5 style={{ cursor: "pointer" }}>EXPORTAR GRADE</h5>
          <h5>AJUDA</h5>
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
