import { useNavigate } from "react-router-dom";
import type { Match } from "../../types";
import { PlayerSlot } from "./PlayerSlot";
import { formatSetScore } from "../../utils/scoringLogic";
import { usePermissionStore } from "../../stores/permissionStore";
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
            {/* 當前已結束局數比分 */}
            <span className="match-card__round-name">
              {formatSetScore(
                match.sets,
                match.status === "live" ? match.currentSet : undefined
              )}
            </span>
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
        <div className="match-card__score-info">
          {match.sets && match.sets.length > 0 ? (
            <div>
              {/* 如果比賽進行中，顯示當前局分數 */}
              {match.status === "live" &&
                match.currentSet !== undefined &&
                match.sets[match.currentSet] && (
                  <span className="match-card__value match-card__value--live">
                    {match.sets[match.currentSet].p1Score}-
                    {match.sets[match.currentSet].p2Score}
                  </span>
                )}
            </div>
          ) : (
            <div>
              <span className="match-card__value match-card__value--vs">V.S.</span>
            </div>
          )}
        </div>

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
