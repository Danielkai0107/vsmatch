import type { TournamentFormat, Match } from '../../types';
import { BracketStage } from './BracketStage';
import './BracketView.scss';

interface BracketViewProps {
  format: TournamentFormat;
  matches: Record<string, Match>;
  tournamentId: string;
}

export function BracketView({
  format,
  matches,
  tournamentId,
}: BracketViewProps) {
  return (
    <div className="bracket-view">
      <div className="bracket-view__container">
        {format.stages.map((stage) => (
          <BracketStage
            key={stage.round}
            stage={stage}
            matches={matches}
            tournamentId={tournamentId}
          />
        ))}
      </div>
    </div>
  );
}

