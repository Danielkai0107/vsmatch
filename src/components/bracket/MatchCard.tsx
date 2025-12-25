import { useNavigate } from 'react-router-dom';
import type { Match } from '../../types';
import { PlayerSlot } from './PlayerSlot';
import { formatSetScore } from '../../utils/scoringLogic';
import { usePermissionStore } from '../../stores/permissionStore';
import './MatchCard.scss';

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
      case 'live':
        return 'match-card--live';
      case 'completed':
        return 'match-card--completed';
      default:
        return 'match-card--pending';
    }
  };

  const handleClick = () => {
    if (!match.matchId) return;
    
    // 計分員進入計分頁面
    if (hasScorePermission && match.status !== 'completed') {
      navigate(`/score/${tournamentId}/${match.matchId}`);
    } 
    // 觀眾進入觀看頁面
    else if (match.status === 'live' || match.status === 'completed') {
      navigate(`/match/${tournamentId}/${match.matchId}`);
    }
  };

  const isClickable = (hasScorePermission && match.status !== 'completed') || 
                      (match.status === 'live' || match.status === 'completed');

  return (
    <div
      className={`match-card ${getStatusClass()} ${
        isClickable ? 'match-card--clickable' : ''
      }`}
      onClick={handleClick}
    >
      <div className="match-card__header">
        <span>{roundName}</span>
        {match.status === 'live' && (
          <span className="match-card__status match-card__status--live">
            進行中
          </span>
        )}
        {match.status === 'completed' && (
          <span className="match-card__status match-card__status--completed">已完成</span>
        )}
        {hasScorePermission && match.status !== 'completed' && (
          <span className="match-card__clickable-hint">點擊計分 →</span>
        )}
        {!hasScorePermission && (match.status === 'live' || match.status === 'completed') && (
          <span className="match-card__clickable-hint">點擊觀看 →</span>
        )}
      </div>

      <div className="match-card__players">
        <PlayerSlot
          player={match.player1 || null}
          isWinner={match.winner === match.player1?.name}
        />
        <PlayerSlot
          player={match.player2 || null}
          isWinner={match.winner === match.player2?.name}
        />
      </div>

      {match.sets && match.sets.length > 0 && (
        <div className="match-card__score-info">
          {/* 顯示獲勝局數 */}
          <div className="match-card__sets">
            <span className="match-card__label">局數:</span>
            <span className="match-card__value">{formatSetScore(match.sets)}</span>
          </div>
          
          {/* 如果比賽進行中，顯示當前局分數 */}
          {match.status === 'live' && match.currentSet !== undefined && match.sets[match.currentSet] && (
            <div className="match-card__current-score">
              <span className="match-card__label">當前:</span>
              <span className="match-card__value match-card__value--live">
                {match.sets[match.currentSet].p1Score}-{match.sets[match.currentSet].p2Score}
              </span>
            </div>
          )}
        </div>
      )}

      {match.status === 'completed' && match.winner && (
        <div className="match-card__winner">
          <span>
            勝者: {match.winner}
          </span>
        </div>
      )}
    </div>
  );
}

