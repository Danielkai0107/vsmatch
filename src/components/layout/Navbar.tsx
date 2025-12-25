import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./Navbar.scss";

export function Navbar() {
  const { user, firebaseUser, loading, signInWithGoogle, signOut } = useAuth();

  return (
    <nav className="navbar">
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
                    <span className="navbar__username">{user.displayName}</span>
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
  );
}
