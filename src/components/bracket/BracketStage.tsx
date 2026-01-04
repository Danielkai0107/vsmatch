import { memo } from "react";
import type { Stage, Match } from "../../types";
import { MatchCard } from "./MatchCard";
import "./BracketStage.scss";

interface BracketStageProps {
  stage: Stage;
  matches: Record<string, Match>;
  tournamentId: string;
  isFirst?: boolean;
  isFinal?: boolean;
}

// 🚀 優化：使用 memo 避免不必要的重新渲染
function BracketStageComponent({
  stage,
  matches,
  tournamentId,
  isFirst = false,
  isFinal = false,
}: BracketStageProps) {
  const renderMatch = (formatMatch: (typeof stage.matches)[0]) => {
    const match = matches[formatMatch.id];
    if (!match) {
      return (
        <div
          key={formatMatch.id}
          className="bracket-stage__match-wrapper bracket-stage__match-wrapper--pending"
        >
          <MatchCard
            match={{ matchId: formatMatch.id, status: "pending" }}
            tournamentId={tournamentId}
            roundName={stage.name}
            isFirst={isFirst}
            isFinal={isFinal}
          />
        </div>
      );
    }

    return (
      <MatchCard
        key={formatMatch.id}
        match={match}
        tournamentId={tournamentId}
        roundName={stage.name}
        isFirst={isFirst}
        isFinal={isFinal}
      />
    );
  };

  return (
    <div
      className={`bracket-stage ${isFirst ? "bracket-stage--first" : ""} ${
        isFinal ? "bracket-stage--final" : ""
      }`}
    >
      <div className="bracket-stage__header">
        <h3 className="bracket-stage__title">{stage.name}</h3>
        <p className="bracket-stage__round">第 {stage.round} 輪</p>
      </div>

      <div className="bracket-stage__matches">
        {stage.matches.map(renderMatch)}
      </div>
    </div>
  );
}

export const BracketStage = memo(BracketStageComponent);
