import React from "react";
import { X } from "lucide-react";
import "./ChampionPopup.scss";

interface ChampionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentName: string;
  championName: string;
  runnerUpName?: string;
  tournamentId: string;
}

const ChampionPopup: React.FC<ChampionPopupProps> = ({
  isOpen,
  onClose,
  tournamentName,
  championName,
  runnerUpName,
  tournamentId,
}) => {
  if (!isOpen) return null;

  const handleShare = async () => {
    const shareText = `🏆 【${tournamentName}】比賽結果出爐！\n🥇 冠軍：${championName}${
      runnerUpName ? `\n🥈 亞軍：${runnerUpName}` : ""
    }\n\n快來 VSMatch 查看完整對戰表！`;
    const shareUrl = `${window.location.origin}/tournament/${tournamentId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "VSMatch 比賽結果",
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log("Share failed", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        alert("分享內容已複製到剪貼簿！");
      } catch (err) {
        alert("複製失敗，請手動分享連結");
      }
    }
  };

  return (
    <div className="champion-popup-overlay" onClick={onClose}>
      <div
        className="champion-popup-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="champion-popup-close" onClick={onClose}>
          <X size={24} />
        </button>

        {/* 泡泡特效 */}
        <div className="champion-popup-bubbles">
          <div className="bubble"></div>
          <div className="bubble"></div>
          <div className="bubble"></div>
          <div className="bubble"></div>
          <div className="bubble"></div>
          <div className="bubble"></div>
          <div className="bubble"></div>
          <div className="bubble"></div>
        </div>

        <div className="champion-popup-header">
          <h2 className="champion-popup-logo">VsMatch</h2>
          <h2 className="champion-popup-title">WINNER</h2>
          <p className="champion-popup-tournament">{tournamentName}</p>
        </div>

        <div className="champion-popup-results">
          <div className="champion-popup-rank champion-popup-rank--gold">
            <div className="rank-icon"></div>
            <div className="rank-info">
              <span className="rank-name">{championName}</span>
            </div>
          </div>
        </div>

        <button className="champion-popup-share-btn" onClick={handleShare}>
          <span>SHARE</span>
        </button>
      </div>
    </div>
  );
};

export default ChampionPopup;
