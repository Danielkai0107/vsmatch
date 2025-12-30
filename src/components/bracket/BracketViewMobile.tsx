import { useState, useMemo, memo } from "react";
import type { TournamentFormat, Match } from "../../types";
import { BracketStage } from "./BracketStage";
import "./BracketViewMobile.scss";

interface BracketViewMobileProps {
  format: TournamentFormat;
  matches: Record<string, Match>;
  tournamentId: string;
}

// 🚀 優化：使用 memo 避免不必要的重新渲染
function BracketViewMobileComponent({
  format,
  matches,
  tournamentId,
}: BracketViewMobileProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // 🚀 優化：使用 useMemo 緩存輪次縮寫函數
  const getStageShortName = useMemo(() => (stageName: string) => {
    if (stageName.includes("16")) return "16 強";
    if (stageName.includes("8")) return "8 強";
    if (stageName.includes("準決賽") || stageName.includes("4"))
      return "準決賽";
    if (stageName.includes("決賽")) return "決賽";
    return stageName;
  }, []);

  // 處理滑動手勢
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && activeTab < format.stages.length - 1) {
      // 向左滑動，切換到下一個 tab
      setActiveTab(activeTab + 1);
    }

    if (isRightSwipe && activeTab > 0) {
      // 向右滑動，切換到上一個 tab
      setActiveTab(activeTab - 1);
    }

    // 重置
    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div className="bracket-view-mobile">
      {/* Tabs */}
      <div className="bracket-view-mobile__tabs">
        {format.stages.map((stage, index) => (
          <button
            key={stage.round}
            className={`bracket-view-mobile__tab ${
              activeTab === index ? "bracket-view-mobile__tab--active" : ""
            }`}
            onClick={() => setActiveTab(index)}
          >
            {getStageShortName(stage.name)}
          </button>
        ))}
      </div>

      {/* 內容區域 */}
      <div
        className="bracket-view-mobile__content"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <BracketStage
          key={format.stages[activeTab].round}
          stage={format.stages[activeTab]}
          matches={matches}
          tournamentId={tournamentId}
        />
      </div>
    </div>
  );
}

export const BracketViewMobile = memo(BracketViewMobileComponent);
