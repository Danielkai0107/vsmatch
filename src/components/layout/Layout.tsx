import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import "./Layout.scss";

export function Layout() {
  const location = useLocation();

  // 只在首頁和個人頁顯示 navbar
  const showNavbar =
    location.pathname === "/" || location.pathname === "/profile";

  return (
    <div className="layout">
      {/* 始終掛載 Navbar 以避免切換時的掛載負擔，僅用 CSS 控制顯示 */}
      <div className={showNavbar ? "" : "navbar--hidden"}>
        <Navbar />
      </div>
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
}
