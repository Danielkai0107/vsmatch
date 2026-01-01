import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePopup } from "../../contexts/PopupContext";
import { Home, Plus, User } from "lucide-react";
import "./Navbar.scss";

export function Navbar() {
  const { user, firebaseUser, loading, signInWithGoogle } = useAuth();
  const { showConfirm } = usePopup();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLoginRequired = (message: string, onSuccess?: () => void) => {
    showConfirm(
      message,
      async () => {
        try {
          await signInWithGoogle();
          if (onSuccess) onSuccess();
        } catch (error) {
          console.error("Login failed:", error);
        }
      },
      () => {
        console.log("Login cancelled");
      }
    );
  };

  const handleCreateClick = () => {
    if (user) {
      navigate("/create");
    } else {
      handleLoginRequired("需要登入才能創建賽事，是否立即登入？", () => {
        navigate("/create");
      });
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      handleLoginRequired("請先登入，然後點擊登入", () => {
        navigate("/profile");
      });
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
              ) : (
                <div className="navbar__user">
                  <Link
                    to="/profile"
                    className="navbar__user-link"
                    onClick={handleProfileClick}
                  >
                    {user && firebaseUser?.photoURL ? (
                      <img
                        src={firebaseUser.photoURL}
                        alt={user.displayName}
                        className="navbar__avatar"
                      />
                    ) : (
                      <div className="navbar__avatar navbar__avatar--placeholder">
                        <User size={20} />
                      </div>
                    )}
                    <span className="navbar__username">
                      {user ? user.displayName : "未登入"}
                    </span>
                  </Link>
                </div>
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

          <Link
            to="/profile"
            className={`navbar__mobile-item ${
              location.pathname === "/profile" ? "navbar__mobile-item--active" : ""
            }`}
            onClick={handleProfileClick}
          >
            <User size={22} />
          </Link>
        </nav>
        {/* 創建按鈕 - 獨立 */}
        <button onClick={handleCreateClick} className="navbar__mobile-create">
          <Plus size={24} />
        </button>
      </div>
    </>
  );
}
