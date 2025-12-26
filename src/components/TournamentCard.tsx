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

  const getStatusBadge = () => {
    switch (tournament.status) {
      case "draft":
        return (
          <span className="tournament-card__badge tournament-card__badge--draft">
            報名中
          </span>
        );
      case "live":
        return (
          <span className="tournament-card__badge tournament-card__badge--live">
            進行中
          </span>
        );
      case "finished":
        return (
          <span className="tournament-card__badge tournament-card__badge--finished">
            已結束
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Link to={`/tournament/${tournament.id}`} className="tournament-card">
      <div className="tournament-card__header">
        <div className="tournament-card__info">
          <span className="tournament-card__icon">{sport?.icon || ""}</span>
          <div>
            <h3 className="tournament-card__title">{tournament.name}</h3>
            <p className="tournament-card__sport">
              {sport?.name || "未知運動"}
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

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
        <span>PIN: {tournament.pin}</span>
        <span>{tournament.players.length} 位選手</span>
      </div>
    </Link>
  );
}
