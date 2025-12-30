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

        {/* 進行中的場次 */}
        {liveMatches.length > 0 && (
          <div className="tournament-card__live-matches">
            <div className="tournament-card__live-header">
              <span className="tournament-card__live-badge">進行中</span>
              <span className="tournament-card__live-count">
                {liveMatches.length} 場
              </span>
            </div>
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
                    </div>
                    <div className="tournament-card__match-players">
                      <div className="tournament-card__match-player">
                        <span className="tournament-card__player-name">
                          {match.player1?.name || "TBD"}
                        </span>
                        {currentSet && (
                          <span className="tournament-card__player-score">
                            {currentSet.p1Score}
                          </span>
                        )}
                      </div>
                      <div className="tournament-card__match-vs">vs</div>
                      <div className="tournament-card__match-player">
                        <span className="tournament-card__player-name">
                          {match.player2?.name || "TBD"}
                        </span>
                        {currentSet && (
                          <span className="tournament-card__player-score">
                            {currentSet.p2Score}
                          </span>
                        )}
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
          <span>{tournament.players.length} 組選手</span>
        </div>
      </div>
    </Link>
  );
}
