import { useNavigate } from "react-router-dom";
import type { Match } from "../../types";
import { PlayerSlot } from "./PlayerSlot";
import {
  formatSetScore,
  getCumulativeScore,
  getCurrentSetName,
} from "../../utils/scoringLogic";
import { usePermissionStore } from "../../stores/permissionStore";
import { useTournamentStore } from "../../stores/tournamentStore";
import "./MatchCard.scss";

interface MatchCardProps {
  match: Partial<Match>;
  tournamentId: string;
  roundName: string;
}

export function MatchCard({ match, tournamentId, roundName }: MatchCardProps) {
  const navigate = useNavigate();
  const hasScorePermission = usePermissionStore((state) =>
    state.hasScorePermission(tournamentId)
  );
  const currentTournament = useTournamentStore((state) => state.currentTournament);

  const rule = currentTournament?.config.rules;
  const isCumulative = rule?.scoringMode === "cumulative";
  const sportId = currentTournament?.config.sportId;

  const getStatusClass = () => {
    switch (match.status) {
      case "live":
        return "match-card--live";
      case "completed":
        return "match-card--completed";
      default:
        return "match-card--pending";
    }
  };

  const handleClick = () => {
    if (!match.matchId) return;

    // 檢查是否為輪空比賽（缺少任一選手）
    const isBye = !match.player1 || !match.player2;

    // 輪空比賽不可點擊
    if (isBye) return;

    // 已完成的比賽不可點擊
    if (match.status === "completed") return;

    // 計分員進入計分頁面 (不論是 pending 還是 live)
    if (hasScorePermission) {
      navigate(`/score/${tournamentId}/${match.matchId}`);
    }
    // 觀眾進入進行中的比賽觀看頁面
    else if (match.status === "live") {
      navigate(`/match/${tournamentId}/${match.matchId}`);
    }
  };

  // 檢查是否為輪空比賽
  const isBye = !match.player1 || !match.player2;

  // 只有未完成且非輪空的比賽可以點擊
  const isClickable =
    !isBye &&
    match.status !== "completed" &&
    ((hasScorePermission &&
      (match.status === "pending" || match.status === "live")) ||
      match.status === "live");

  // 計算比分顯示內容
  const renderScoreInfo = () => {
    if (!match.sets || match.sets.length === 0) {
      return (
        <span className="match-card__value match-card__value--vs">V.S.</span>
      );
    }

    if (isCumulative) {
      // 累計制：顯示總分
      const total = getCumulativeScore(match.sets);
      return (
        <span
          className={`match-card__value ${
            match.status === "live" ? "match-card__value--live" : ""
          }`}
        >
          {total.p1}-{total.p2}
        </span>
      );
    } else {
      // 單局制：顯示當前局分數 (live) 或 顯示勝者資訊 (已在底部顯示，這裡可以考慮顯示最終比分)
      if (match.status === "live" && match.currentSet !== undefined) {
        const current = match.sets[match.currentSet];
        if (current) {
          return (
            <span className="match-card__value match-card__value--live">
              {current.p1Score}-{current.p2Score}
            </span>
          );
        }
      } else if (match.status === "completed") {
        // 單局制已完成：可以在這裡顯示最終比分概覽，例如 "21-15, 21-18" 或保持簡潔
        // 根據使用者要求 1：顯示最終比分
        // 對於 sets 模式，我們應該顯示局數比
        const setsWon = formatSetScore(match.sets);
        return <span className="match-card__value">{setsWon}</span>;
      }
    }

    return <span className="match-card__value match-card__value--vs">V.S.</span>;
  };

  // 頂部狀態標籤顯示
  const renderRoundBadge = () => {
    if (!match.sets || match.sets.length === 0) return null;

    if (isCumulative && rule) {
      // 累計制：顯示 "第X節" 或 "完賽"
      if (match.status === "completed") return "完賽";

      // 檢查是否所有預定局數都已打完（且沒進入延長賽或不需延長賽）
      if (match.currentSet !== undefined && match.currentSet >= match.sets.length) {
        return "待確認";
      }

      return getCurrentSetName(rule, match.currentSet || 0, sportId);
    }

    // 單局制：顯示局數比 (如 2-1)
    if (match.status === "completed") return formatSetScore(match.sets);

    // 進行中：排除當前局
    return formatSetScore(
      match.sets,
      match.status === "live" ? match.currentSet : undefined
    );
  };

  return (
    <div
      className={`match-card ${getStatusClass()} ${
        isClickable ? "match-card--clickable" : ""
      }`}
      onClick={handleClick}
    >
      <div className="match-card__header">
        <span>{roundName}</span>
        {match.sets && match.sets.length > 0 && (
          <div className="match-card__value">
            <span className="match-card__round-name">{renderRoundBadge()}</span>
          </div>
        )}
        {match.status === "pending" && (
          <span className="match-card__status match-card__status--pending">
            未開始
          </span>
        )}
        {match.status === "live" && (
          <span className="match-card__status match-card__status--live">
            進行中
          </span>
        )}
        {match.status === "completed" && isBye && (
          <span className="match-card__status match-card__status--bye">
            輪空
          </span>
        )}
        {match.status === "completed" && !isBye && (
          <span className="match-card__status match-card__status--completed">
            已完成
          </span>
        )}
        {hasScorePermission &&
          (match.status === "pending" || match.status === "live") &&
          !isBye && (
            <span className="match-card__clickable-hint">點擊計分</span>
          )}
      </div>

      <div className="match-card__score">
        <div className="match-card__players">
          <PlayerSlot
            player={match.player1 || null}
            isWinner={match.winner === match.player1?.name}
          />
        </div>
        <div className="match-card__score-info">{renderScoreInfo()}</div>

        <div className="match-card__players">
          <PlayerSlot
            player={match.player2 || null}
            isWinner={match.winner === match.player2?.name}
          />
        </div>
      </div>

      {match.status === "completed" && match.winner && (
        <div className="match-card__winner">
          <span>勝者: {match.winner}</span>
        </div>
      )}
    </div>
  );
}
