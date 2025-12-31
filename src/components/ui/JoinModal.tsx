import { useState } from "react";
import { X } from "lucide-react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { usePopup } from "../../contexts/PopupContext";
import type { Tournament, TournamentFormat } from "../../types";
import "./JoinModal.scss";

interface JoinModalProps {
  tournament: Tournament;
  format: TournamentFormat | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function JoinModal({
  tournament,
  format,
  onClose,
  onSuccess,
}: JoinModalProps) {
  const { user } = useAuth();
  const { showPopup } = usePopup();
  const [playerName, setPlayerName] = useState(user?.displayName || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!playerName.trim()) {
      setError("請輸入姓名");
      return;
    }

    // 檢查名字是否重複
    if (tournament.players.some((p) => p.name === playerName.trim())) {
      setError("此名字已被使用，請使用其他名字");
      return;
    }

    // 檢查是否已滿人（報隊制不限人數）
    if (
      format?.type !== "koth" &&
      format &&
      tournament.players.length >= format.totalSlots
    ) {
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

      // 如果是 KOTH 且已開始，新加入的人應直接進入排隊名單
      const isKothLive =
        format?.type === "koth" && tournament.status === "live";

      await updateDoc(tournamentRef, {
        players: arrayUnion(playerData),
        ...(isKothLive ? { kothQueue: arrayUnion(playerName.trim()) } : {}),
      });

      showPopup("報名成功！", "success");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error joining tournament:", error);
      setError("報名失敗，請重試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-modal" onClick={onClose}>
      <div className="join-modal__content" onClick={(e) => e.stopPropagation()}>
        <button className="join-modal__close" onClick={onClose}>
          <X size={20} color="#6b7280" />
        </button>

        <h2 className="join-modal__title">隊伍名稱</h2>
        {/* <p className="join-modal__subtitle">{tournament.name}</p> */}

        <div className="join-modal__form">
          {/* <label className="join-modal__label">參賽名稱</label> */}
          <input
            type="text"
            placeholder="輸入你的暱稱"
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value);
              setError("");
            }}
            className={`join-modal__input ${
              error ? "join-modal__input--error" : ""
            }`}
            autoFocus
          />
          {error && <p className="join-modal__error">{error}</p>}

          <div className="join-modal__note">
            {user ? (
              <>
                <span className="join-modal__note-text">已連結帳號</span>
              </>
            ) : (
              <>
                <span className="join-modal__note-text">訪客參與</span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!playerName.trim() || loading}
          className="join-modal__submit-btn"
        >
          {loading ? "報名中..." : "確認報名"}
        </button>
      </div>
    </div>
  );
}
