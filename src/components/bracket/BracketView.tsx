import { useState, useEffect, memo } from "react";
import type { TournamentFormat, Match } from "../../types";
import { BracketStage } from "./BracketStage";
import { BracketViewMobile } from "./BracketViewMobile";
import "./BracketView.scss";

interface BracketViewProps {
  format: TournamentFormat;
  matches: Record<string, Match>;
  tournamentId: string;
}

// 🚀 優化：使用 memo 避免不必要的重新渲染
function BracketViewComponent({
  format,
  matches,
  tournamentId,
}: BracketViewProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // 🚀 優化：使用 debounce 減少 resize 觸發頻率
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const checkMobile = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth <= 768);
      }, 150); // 150ms debounce
    };

    window.addEventListener("resize", checkMobile);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", checkMobile);
    };
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
        {format.stages.map((stage, index) => (
          <BracketStage
            key={stage.round}
            stage={stage}
            matches={matches}
            tournamentId={tournamentId}
            isFirst={index === 0}
            isFinal={index === format.stages.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

export const BracketView = memo(BracketViewComponent);
