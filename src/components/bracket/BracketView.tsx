import { useState, useEffect } from 'react';
import type { TournamentFormat, Match } from '../../types';
import { BracketStage } from './BracketStage';
import { BracketViewMobile } from './BracketViewMobile';
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
  const [isMobile, setIsMobile] = useState(false);

  // 檢測是否為手機版
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 手機版使用獨立組件
  if (isMobile) {
    return (
      <BracketViewMobile
        format={format}
        matches={matches}
        tournamentId={tournamentId}
      />
    );
  }

  // 桌面版：水平排列所有輪次（樹狀圖）
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

