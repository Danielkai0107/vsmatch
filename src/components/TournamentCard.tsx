import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Tournament, Match } from "../types";
import { getSportById, getFormatById } from "../config/sportsData";
import { getMatchRoundName } from "../utils/bracketLogic";
import "./TournamentCard.scss";

interface TournamentCardProps {
  tournament: Tournament;
}

export function TournamentCard({ tournament }: TournamentCardProps) {
  const sport = getSportById(tournament.config.sportId);
  const format = getFormatById(tournament.config.formatId);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);

  // 格式化比賽時間（開始或結束）
  const formatTime = () => {
    // 優先顯示結束時間（已結束的比賽）
    const finishedAt = (tournament as any).finishedAt;
    const startedAt = (tournament as any).startedAt;

    let timeStr = null;
    let isFinished = false;

    if (finishedAt && tournament.status === "finished") {
      timeStr = finishedAt;
      isFinished = true;
    } else if (startedAt && tournament.status === "live") {
      timeStr = startedAt;
      isFinished = false;
    }

    if (!timeStr) return null;

    const date = new Date(timeStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    // 如果是今天
    if (diffDays === 0) {
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 1) return isFinished ? "剛結束" : "剛開始";
        return `${diffMins} 分鐘前`;
      }
      return `${diffHours} 小時前`;
    }
    // 如果是昨天或前天
    if (diffDays === 1) return "昨天";
    if (diffDays === 2) return "前天";

    // 超過兩天，顯示日期
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 監聽進行中的場次
  useEffect(() => {
    if (tournament.status !== "live") {
      setLiveMatches([]);
      return;
    }

    const matchesRef = collection(db, "tournaments", tournament.id, "matches");
    const q = query(matchesRef, where("status", "==", "live"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matches: Match[] = [];
      snapshot.forEach((doc) => {
        matches.push({
          ...doc.data(),
          matchId: doc.id,
        } as Match);
      });
      setLiveMatches(matches);
    });

    return () => unsubscribe();
  }, [tournament.id, tournament.status]);

  const getStatusText = () => {
    switch (tournament.status) {
      case "draft":
        return "報名中";
      case "live":
        return "進行中";
      case "finished":
        return "已結束";
      default:
        return "未知";
    }
  };

  return (
    <Link to={`/tournament/${tournament.id}`} className="tournament-card">
      {/* 藍色 Header */}
      <div className="tournament-card__header">
        <div className="tournament-card__pin">PIN: {tournament.pin}</div>
        <div className="tournament-card__badges">
          <span className="tournament-card__sport-badge">
            {sport?.name || "未知運動"}
          </span>
          <span
            className={`tournament-card__status-badge tournament-card__status-badge--${tournament.status}`}
          >
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* 白色內容區域 */}
      <div className="tournament-card__body">
        <h3 className="tournament-card__title">{tournament.name}</h3>

        {/* 已結束：顯示冠軍和亞軍 */}
        {tournament.status === "finished" &&
          (() => {
            console.log("已結束的比賽:", {
              name: tournament.name,
              champion: (tournament as any).champion,
              runnerUp: (tournament as any).runnerUp,
            });
            return (
              <div className="tournament-card__live-matches">
                <div className="tournament-card__matches-list">
                  <div className="tournament-card__match">
                    <div className="tournament-card__match-players">
                      {(tournament as any).champion && (
                        <div className="tournament-card__match-player">
                          <span className="tournament-card__player-name">
                            {(tournament as any).champion}
                          </span>
                          <span className="tournament-card__player-score tournament-card__player-score--champion">
                            冠軍
                          </span>
                        </div>
                      )}
                      {(tournament as any).runnerUp && (
                        <div className="tournament-card__match-player">
                          <span className="tournament-card__player-name">
                            {(tournament as any).runnerUp}
                          </span>
                          <span className="tournament-card__player-score tournament-card__player-score--runner">
                            亞軍
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* 進行中的場次 */}
        {tournament.status === "live" && liveMatches.length > 0 && (
          <div className="tournament-card__live-matches">
            <div className="tournament-card__matches-list">
              {liveMatches.slice(0, 3).map((match) => {
                const currentSet = match.sets[match.currentSet];
                const roundName = format
                  ? getMatchRoundName(format, match.matchId)
                  : "";

                return (
                  <div key={match.matchId} className="tournament-card__match">
                    <div className="tournament-card__match-round">
                      {roundName}
                      <span className="tournament-card__live-badge">LIVE</span>
                    </div>
                    <div className="tournament-card__match-players">
                      <div className="tournament-card__match-player">
                        <span className="tournament-card__player-name">
                          {match.player1?.name || "TBD"}
                        </span>
                        <span className="tournament-card__player-score">
                          {currentSet ? currentSet.p1Score : "-"}
                        </span>
                      </div>
                      <div className="tournament-card__match-player">
                        <span className="tournament-card__player-name">
                          {match.player2?.name || "TBD"}
                        </span>
                        <span className="tournament-card__player-score">
                          {currentSet ? currentSet.p2Score : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {liveMatches.length > 3 && (
                <div className="tournament-card__more">
                  還有 {liveMatches.length - 3} 場進行中...
                </div>
              )}
            </div>
          </div>
        )}

        <div className="tournament-card__footer">
          <span className="tournament-card__footer-players">
            {tournament.players.length} 組選手
          </span>
          {(tournament.status === "live" || tournament.status === "finished") &&
            formatTime() && (
              <span className="tournament-card__footer-time">
                {formatTime()}
              </span>
            )}
        </div>
      </div>
    </Link>
  );
}
