import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Home, Plus, User, LogOut, LogIn } from "lucide-react";
import "./Navbar.scss";

export function Navbar() {
  const { user, firebaseUser, loading, signInWithGoogle, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleCreateClick = () => {
    if (user) {
      navigate("/create");
    } else {
      // 未登入時提示登入
      if (window.confirm("需要登入才能創建賽事，是否立即登入？")) {
        signInWithGoogle();
      }
    }
  };

  const handleLogout = async () => {
    if (window.confirm("確定要登出嗎？")) {
      await signOut();
    }
  };

  return (
    <>
      {/* 桌面版 Navbar - 保留原樣 */}
      <nav className="navbar navbar--desktop">
        <div className="navbar__container">
          <div className="navbar__content">
            <div className="navbar__brand">
              <Link to="/" className="navbar__logo">
                VSMatch
              </Link>
            </div>

            <div className="navbar__actions">
              {loading ? (
                <span className="navbar__loading">載入中...</span>
              ) : user ? (
                <>
                  <div className="navbar__user">
                    <Link to="/profile" className="navbar__user-link">
                      {firebaseUser?.photoURL && (
                        <img
                          src={firebaseUser.photoURL}
                          alt={user.displayName}
                          className="navbar__avatar"
                        />
                      )}
                      <span className="navbar__username">
                        {user.displayName}
                      </span>
                    </Link>
                    <button
                      onClick={signOut}
                      className="navbar__btn navbar__btn--text"
                    >
                      登出
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="navbar__btn navbar__btn--primary"
                >
                  登入
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 手機版底部 Navbar */}
      <div className="navbar__mobile-wrapper">
        {/* 其他導航按鈕 */}
        <nav className="navbar navbar--mobile">
          <Link
            to="/"
            className={`navbar__mobile-item ${
              location.pathname === "/" ? "navbar__mobile-item--active" : ""
            }`}
          >
            <Home size={22} />
          </Link>

          {user && (
            <Link
              to="/profile"
              className={`navbar__mobile-item ${
                location.pathname === "/profile"
                  ? "navbar__mobile-item--active"
                  : ""
              }`}
            >
              <User size={22} />
            </Link>
          )}

          {user ? (
            <button onClick={handleLogout} className="navbar__mobile-item">
              <LogOut size={22} />
            </button>
          ) : (
            <button onClick={signInWithGoogle} className="navbar__mobile-item">
              <LogIn size={22} />
            </button>
          )}
        </nav>
        {/* 創建按鈕 - 獨立 */}
        <button onClick={handleCreateClick} className="navbar__mobile-create">
          <Plus size={24} />
        </button>
      </div>
    </>
  );
}
