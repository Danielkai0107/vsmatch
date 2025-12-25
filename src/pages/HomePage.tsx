import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TournamentCard } from "../components/TournamentCard";
import { useTournaments } from "../hooks/useFirestore";
import { useTournamentStore } from "../stores/tournamentStore";
import { useAuth } from "../contexts/AuthContext";
import { findTournamentByScorerPin, findTournamentByPin } from "../utils/pinCode";
import { usePermissionStore } from "../stores/permissionStore";
import "./HomePage.scss";

export function HomePage() {
  useTournaments(); // 開始監聽比賽列表

  const { tournaments, loading } = useTournamentStore();
  const { user, signInWithGoogle } = useAuth();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showScorerPinModal, setShowScorerPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [scorerPinInput, setScorerPinInput] = useState("");
  const [scorerPinError, setScorerPinError] = useState("");
  const [scorerPinLoading, setScorerPinLoading] = useState(false);
  const navigate = useNavigate();
  const grantScorePermission = usePermissionStore((state) => state.grantScorePermission);

  const handleCreateTournament = async () => {
    if (!user) {
      // 未登入，提示登入
      if (confirm('需要登入才能創建賽事，是否立即登入？')) {
        try {
          await signInWithGoogle();
        } catch (error) {
          console.error('Login failed:', error);
          alert('登入失敗，請重試');
        }
      }
      return;
    }
    
    // 已登入，直接進入創建頁面
    navigate('/create');
  };

  const handleJoinWithPin = async () => {
    if (pinInput.length !== 6) {
      setPinError('PIN 碼必須是 6 位數');
      return;
    }

    setPinLoading(true);
    setPinError('');

    try {
      const tournament = await findTournamentByPin(pinInput);

      if (tournament) {
        // 檢查報名狀態
        if (tournament.status !== 'draft') {
          setPinError('此比賽已不接受報名');
          return;
        }
        
        // 找到比賽，跳轉到報名頁面
        setShowPinModal(false);
        setPinInput('');
        navigate('/join', { state: { pin: pinInput } });
      } else {
        setPinError('找不到此 PIN 碼，請確認後重試');
      }
    } catch (error) {
      console.error('Error validating PIN:', error);
      setPinError('驗證失敗，請重試');
    } finally {
      setPinLoading(false);
    }
  };

  const handleScorerPinLogin = async () => {
    if (scorerPinInput.length !== 6) {
      setScorerPinError('計分 PIN 必須是 6 位數');
      return;
    }

    setScorerPinLoading(true);
    setScorerPinError('');

    try {
      const tournament = await findTournamentByScorerPin(scorerPinInput);

      if (tournament) {
        // 授予計分權限
        grantScorePermission(tournament.id, scorerPinInput);
        
        // 導向比賽頁面
        navigate(`/tournament/${tournament.id}`);
        setShowScorerPinModal(false);
        setScorerPinInput('');
      } else {
        setScorerPinError('找不到此計分 PIN，請向主辦人確認');
      }
    } catch (error) {
      console.error('Error validating scorer PIN:', error);
      setScorerPinError('驗證失敗，請重試');
    } finally {
      setScorerPinLoading(false);
    }
  };

  return (
    <div className="home-page">
      {/* 主要操作區塊 */}
      <div className="home-page__hero">
        <h1 className="home-page__hero-title">VSMatch</h1>
        <p className="home-page__hero-subtitle">運動賽事管理系統</p>
        
        <div className="home-page__actions">
          {/* 創建賽事按鈕 */}
          <button
            onClick={handleCreateTournament}
            className="action-card action-card--create"
          >
            <div className="action-card__icon">🏆</div>
            <div className="action-card__content">
              <h2 className="action-card__title">創建賽事</h2>
              <p className="action-card__desc">建立並管理你的比賽</p>
            </div>
          </button>

          {/* 報名 PIN 按鈕 */}
          <button
            onClick={() => setShowPinModal(true)}
            className="action-card action-card--join"
          >
            <div className="action-card__icon">🎯</div>
            <div className="action-card__content">
              <h2 className="action-card__title">報名 PIN</h2>
              <p className="action-card__desc">輸入 PIN 碼參加比賽</p>
            </div>
          </button>

          {/* 計分 PIN 按鈕 */}
          <button
            onClick={() => setShowScorerPinModal(true)}
            className="action-card action-card--scorer"
          >
            <div className="action-card__icon">📊</div>
            <div className="action-card__content">
              <h2 className="action-card__title">計分 PIN</h2>
              <p className="action-card__desc">志工計分員登入</p>
            </div>
          </button>
        </div>
      </div>

      {/* 報名 PIN 碼輸入彈窗 */}
      {showPinModal && (
        <div className="pin-modal" onClick={() => setShowPinModal(false)}>
          <div className="pin-modal__content" onClick={(e) => e.stopPropagation()}>
            <button
              className="pin-modal__close"
              onClick={() => {
                setShowPinModal(false);
                setPinInput('');
                setPinError('');
              }}
            >
              ✕
            </button>
            <div className="pin-modal__logo">🎯 報名 PIN</div>
            <p className="pin-modal__subtitle">
              請輸入比賽 PIN 碼報名參賽
            </p>
            <input
              type="text"
              placeholder="輸入 6 位數 PIN"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                setPinError('');
              }}
              className={`pin-modal__input ${pinError ? 'pin-modal__input--error' : ''}`}
              maxLength={6}
              autoFocus
            />
            {pinError && (
              <p className="pin-modal__error">{pinError}</p>
            )}
            <button
              onClick={handleJoinWithPin}
              disabled={pinInput.length !== 6 || pinLoading}
              className="pin-modal__button"
            >
              {pinLoading ? '驗證中...' : '進入報名'}
            </button>
          </div>
        </div>
      )}

      {/* 計分 PIN 碼輸入彈窗 */}
      {showScorerPinModal && (
        <div className="pin-modal" onClick={() => setShowScorerPinModal(false)}>
          <div className="pin-modal__content pin-modal__content--scorer" onClick={(e) => e.stopPropagation()}>
            <button
              className="pin-modal__close"
              onClick={() => {
                setShowScorerPinModal(false);
                setScorerPinInput('');
                setScorerPinError('');
              }}
            >
              ✕
            </button>
            <div className="pin-modal__logo pin-modal__logo--scorer">
              🔒 計分 PIN
            </div>
            <p className="pin-modal__subtitle">
              請輸入主辦人提供的計分 PIN 碼
            </p>
            <input
              type="text"
              placeholder="輸入 6 位數 PIN"
              value={scorerPinInput}
              onChange={(e) => {
                setScorerPinInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                setScorerPinError('');
              }}
              className={`pin-modal__input ${scorerPinError ? 'pin-modal__input--error' : ''}`}
              maxLength={6}
              autoFocus
            />
            {scorerPinError && (
              <p className="pin-modal__error">{scorerPinError}</p>
            )}
            <button
              onClick={handleScorerPinLogin}
              disabled={scorerPinInput.length !== 6 || scorerPinLoading}
              className="pin-modal__button pin-modal__button--scorer"
            >
              {scorerPinLoading ? '驗證中...' : '計分員登入'}
            </button>
            <p className="pin-modal__note">
              ⚠️ 如果您是要報名參賽，請使用<strong>報名 PIN</strong>
            </p>
          </div>
        </div>
      )}

      {/* 比賽列表 */}
      <div className="home-page__section">
        <h2 className="home-page__section-title">所有比賽</h2>

        {loading ? (
          <div className="home-page__loading">
            <div className="home-page__spinner"></div>
            <p className="home-page__loading-text">載入中...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="home-page__empty">
            <p className="home-page__empty-text">目前沒有比賽</p>
          </div>
        ) : (
          <div className="home-page__grid">
            {tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
