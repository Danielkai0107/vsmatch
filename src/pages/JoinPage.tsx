import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { usePopup } from "../contexts/PopupContext";
import { findTournamentByPin } from "../utils/pinCode";
import { getSportById, getFormatById } from "../config/sportsData";
import type { Tournament } from "../types";
import { ArrowLeft } from "lucide-react";
import Loading from "../components/ui/Loading";
import "./JoinPage.scss";

export function JoinPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { showPopup } = usePopup();
  
  // 支持兩種方式獲取 pin：
  // 1. 從 URL 查詢參數（掃描 QR code）
  // 2. 從 location.state（通過 Link 組件）
  const initialPin = 
    searchParams.get("pin") || 
    (location.state as { pin?: string })?.pin || 
    "";

  const [playerName, setPlayerName] = useState("");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // 自動載入比賽資料
  useEffect(() => {
    const loadTournament = async () => {
      if (!initialPin) {
        setError("缺少比賽 PIN 碼");
        setLoading(false);
        return;
      }

      if (initialPin.length !== 6) {
        setError("PIN 碼格式錯誤");
        setLoading(false);
        return;
      }

      try {
        const found = await findTournamentByPin(initialPin);
        if (found) {
          if (found.status !== "draft") {
            setError("此比賽已不接受報名");
            setTournament(null);
          } else {
            setTournament(found);
          }
        } else {
          setError("找不到此比賽");
          setTournament(null);
        }
      } catch (error) {
        console.error("Error finding tournament:", error);
        setError("載入失敗，請重試");
      } finally {
        setLoading(false);
      }
    };

    loadTournament();
  }, [initialPin]);

  const handleJoin = async () => {
    if (!tournament || !playerName.trim()) {
      return;
    }

    // 檢查名字是否重複
    if (tournament.players.some((p) => p.name === playerName.trim())) {
      setError("此名字已被使用，請使用其他名字");
      return;
    }

    // 檢查是否已滿人
    const format = getFormatById(tournament.config.formatId);
    if (format && tournament.players.length >= format.totalSlots) {
      setError("比賽人數已滿");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const tournamentRef = doc(db, "tournaments", tournament.id);

      // 構建 player 物件，如果有登入則記錄 userId
      const playerData = {
        name: playerName.trim(),
        index: tournament.players.length,
        ...(user ? { userId: user.uid } : {}), // 如果有登入，記錄 userId
      };

      await updateDoc(tournamentRef, {
        players: arrayUnion(playerData),
      });

      showPopup("報名成功！", "success");
      navigate(`/tournament/${tournament.id}`);
    } catch (error) {
      console.error("Error joining tournament:", error);
      setError("報名失敗，請重試");
    } finally {
      setLoading(false);
    }
  };

  const sport = tournament ? getSportById(tournament.config.sportId) : null;
  const format = tournament ? getFormatById(tournament.config.formatId) : null;

  if (loading) {
    return <Loading fullScreen text="載入比賽資料中..." />;
  }

  if (error || !tournament) {
    return (
      <div className="join-page">
        <button 
          onClick={() => navigate("/")}
          className="join-page__back-btn"
        >
          <ArrowLeft />
        </button>
        <div className="join-page__error-state">
          <div className="error-icon"></div>
          <h2>{error || "找不到比賽"}</h2>
          <p>請確認 PIN 碼是否正確</p>
          <button
            onClick={() => navigate("/")}
            className="join-page__back-home-btn"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="join-page">
      <button 
        onClick={() => navigate("/")}
        className="join-page__back-btn"
      >
        <ArrowLeft />
      </button>
      <h1 className="join-page__title">選手報名</h1>

      <div className="join-page__card">
        {/* 顯示比賽資訊 */}
        {tournament && (
          <>
            <div className="join-page__tournament-info">
              <h3 className="join-page__tournament-title">{tournament.name}</h3>
              <div className="join-page__tournament-meta">
                <span>{sport?.icon}</span>
                <span>{sport?.name}</span>
                <span>•</span>
                <span>{format?.name}</span>
              </div>
              <div className="join-page__tournament-stats">
                目前報名人數：{tournament.players.length} / {format?.totalSlots}
              </div>
            </div>

            {/* 步驟 3: 輸入選手名字 */}
            <div className="join-page__form-group">
              <label>您的姓名</label>
              <input
                type="text"
                placeholder="輸入您的姓名"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  setError("");
                }}
                className="join-page__name-input"
                autoFocus
              />
              {error && tournament && (
                <p className="join-page__error">{error}</p>
              )}
            </div>

            <button
              onClick={handleJoin}
              disabled={!playerName.trim() || loading}
              className="join-page__submit-btn"
            >
              {loading ? "報名中..." : "確認報名"}
            </button>

            <button
              onClick={() => navigate("/")}
              className="join-page__reset-btn"
            >
              返回首頁
            </button>
          </>
        )}
      </div>
    </div>
  );
}
