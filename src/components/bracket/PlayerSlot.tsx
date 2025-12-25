import type { PlayerRef } from '../../types';
import './PlayerSlot.scss';

interface PlayerSlotProps {
  player: PlayerRef | null;
  isWinner?: boolean;
}

export function PlayerSlot({ player, isWinner = false }: PlayerSlotProps) {
  if (!player) {
    return (
      <div className="player-slot player-slot--empty">
        等待選手...
      </div>
    );
  }

  return (
    <div
      className={`player-slot ${
        isWinner
          ? 'player-slot--winner'
          : 'player-slot--default'
      }`}
    >
      {player.name}
    </div>
  );
}

