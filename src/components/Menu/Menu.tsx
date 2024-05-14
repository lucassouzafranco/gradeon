import "./Menu.css";
import { IoMenu } from "react-icons/io5";
import gradeon_logo from "../../assets/gradeon_logo.png";
import { FaUserCircle } from "react-icons/fa";

const Menu: React.FC = () => {
  return (
    <div className="menuContainer">
      <div className="menuContent">
        <div className="menuAndLogo">
          <IoMenu />
          <img src={gradeon_logo} alt="logo do GRADEON" />
        </div>
        <div className="menuOptions">
          <h5>EXPORTAR GRADE</h5>
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
