import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import "./Layout.scss";

export function Layout() {
  const location = useLocation();
  
  // 只在首頁和個人頁顯示 navbar
  const showNavbar = location.pathname === "/" || location.pathname === "/profile";

  return (
    <div className="layout">
      {showNavbar && <Navbar />}
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
}
