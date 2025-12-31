import React from "react";
import { Share2, X } from "lucide-react";
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

        <div className="champion-popup-header">
          <div className="champion-popup-trophy">🏆</div>
          <h2 className="champion-popup-title">恭喜冠軍誕生！</h2>
          <p className="champion-popup-tournament">{tournamentName}</p>
        </div>

        <div className="champion-popup-results">
          <div className="champion-popup-rank champion-popup-rank--gold">
            <div className="rank-icon">🥇</div>
            <div className="rank-info">
              <span className="rank-label">冠軍</span>
              <span className="rank-name">{championName}</span>
            </div>
          </div>

          {runnerUpName && (
            <div className="champion-popup-rank champion-popup-rank--silver">
              <div className="rank-icon">🥈</div>
              <div className="rank-info">
                <span className="rank-label">亞軍</span>
                <span className="rank-name">{runnerUpName}</span>
              </div>
            </div>
          )}
        </div>

        <button className="champion-popup-share-btn" onClick={handleShare}>
          <Share2 size={20} />
          <span>分享比賽結果</span>
        </button>
      </div>
    </div>
  );
};

export default ChampionPopup;
