import type { Stage, Match } from '../../types';
import { MatchCard } from './MatchCard';
import './BracketStage.scss';

interface BracketStageProps {
  stage: Stage;
  matches: Record<string, Match>;
  tournamentId: string;
}

export function BracketStage({
  stage,
  matches,
  tournamentId,
}: BracketStageProps) {
  const renderMatch = (formatMatch: typeof stage.matches[0]) => {
    const match = matches[formatMatch.id];
    if (!match) {
      return (
        <div key={formatMatch.id} className="bracket-stage__match-wrapper bracket-stage__match-wrapper--pending">
          <MatchCard
            match={{ matchId: formatMatch.id, status: 'pending' }}
            tournamentId={tournamentId}
            roundName={stage.name}
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
      />
    );
  };

  return (
    <div className="bracket-stage">
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

