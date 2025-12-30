import { memo } from "react";
import type { PlayerRef } from "../../types";
import "./PlayerSlot.scss";

interface PlayerSlotProps {
  player: PlayerRef | null;
  isWinner?: boolean;
}

// 🚀 優化：使用 memo 避免不必要的重新渲染
function PlayerSlotComponent({ player, isWinner = false }: PlayerSlotProps) {
  if (!player) {
    return <div className="player-slot player-slot--empty">等待中</div>;
  }

  return (
    <div
      className={`player-slot ${
        isWinner ? "player-slot--winner" : "player-slot--default"
      }`}
    >
      {player.name}
    </div>
  );
}

export const PlayerSlot = memo(PlayerSlotComponent);
