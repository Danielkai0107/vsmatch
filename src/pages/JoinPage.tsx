import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../lib/firebase";
import { usePopup } from "../contexts/PopupContext";
import { findTournamentByPin } from "../utils/pinCode";
import { getSportById, getFormatById } from "../config/sportsData";
import type { Tournament } from "../types";
import { ArrowLeft } from "lucide-react";
import "./JoinPage.scss";

export function JoinPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showPopup } = usePopup();
  const initialPin = (location.state as { pin?: string })?.pin || "";

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

      await updateDoc(tournamentRef, {
        players: arrayUnion({
          name: playerName.trim(),
          index: tournament.players.length,
        }),
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
    return (
      <div className="join-page">
        <button 
          onClick={() => navigate("/")}
          className="join-page__back-btn"
        >
          <ArrowLeft />
        </button>
        <div className="join-page__loading">
          <div className="spinner"></div>
          <p>載入比賽資料中...</p>
        </div>
      </div>
    );
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
