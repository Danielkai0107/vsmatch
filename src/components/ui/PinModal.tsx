import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePopup } from "../../contexts/PopupContext";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import "./PinModal.scss";

interface PinModalProps {
  pin: string;
  scorerPin: string;
  tournamentId?: string; // 可選：如果提供則顯示「查看比賽」按鈕
  onClose: () => void;
  initialSlide?: number; // 0 = 報名碼, 1 = 計分碼
}

export function PinModal({
  pin,
  scorerPin,
  tournamentId,
  onClose,
  initialSlide = 0,
}: PinModalProps) {
  const navigate = useNavigate();
  const { showPopup } = usePopup();
  const [currentSlide, setCurrentSlide] = useState(initialSlide);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // 處理觸摸滑動
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      // 向左滑動
      setCurrentSlide((prev) => Math.min(prev + 1, 1));
    }

    if (touchStart - touchEnd < -50) {
      // 向右滑動
      setCurrentSlide((prev) => Math.max(prev - 1, 0));
    }
  };

  // 複製PIN碼並顯示提示
  const handleCopyPin = async (pinCode: string, type: string) => {
    try {
      await navigator.clipboard.writeText(pinCode);
      showPopup(`已複製${type} PIN 碼`, "success");
    } catch (error) {
      showPopup("複製失敗，請重試", "error");
    }
  };

  // 切換到上一張卡片
  const handlePrevSlide = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };

  // 切換到下一張卡片
  const handleNextSlide = () => {
    setCurrentSlide((prev) => Math.min(prev + 1, 1));
  };

  return (
    <div className="pin-modal__overlay" onClick={onClose}>
      <div
        className="pin-modal__container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 關閉按鈕 */}
        <button className="pin-modal__close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        {/* 標題 */}
        <div className="pin-modal__header"></div>

        {/* 左箭頭按鈕 */}
        {currentSlide > 0 && (
          <button
            className="pin-modal__arrow pin-modal__arrow--left"
            onClick={handlePrevSlide}
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {/* 右箭頭按鈕 */}
        {currentSlide < 1 && (
          <button
            className="pin-modal__arrow pin-modal__arrow--right"
            onClick={handleNextSlide}
          >
            <ChevronRight size={28} />
          </button>
        )}

        {/* 可滑動的 PIN 卡片容器 */}
        <div
          className="pin-modal__slider-container"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="pin-modal__slider"
            style={{
              transform: `translateX(-${currentSlide * 100}%)`,
            }}
          >
            {/* 比賽 PIN 卡片 */}
            <div className="pin-modal__slide">
              <div className="pin-modal__pin-card pin-modal__pin-card--public">
                <div className="pin-modal__pin-label">報名碼</div>
                <div className="pin-modal__pin-code pin-modal__pin-code--public">
                  {pin}
                </div>
                <ul className="pin-modal__pin-desc">
                  <li>給選手報名使用</li>
                  <li>給觀眾查看對戰表使用</li>
                  <li>可以公開張貼</li>
                </ul>
                <div className="pin-modal__actions">
                  {tournamentId && (
                    <button
                      onClick={() => {
                        navigate(`/tournament/${tournamentId}`);
                      }}
                      className="pin-modal__btn pin-modal__btn--outline"
                    >
                      查看比賽
                    </button>
                  )}
                  <button
                    onClick={() => handleCopyPin(pin, "比賽")}
                    className="pin-modal__btn pin-modal__btn--primary"
                  >
                    複製
                  </button>
                </div>
              </div>
            </div>

            {/* 計分 PIN 卡片 */}
            <div className="pin-modal__slide">
              <div className="pin-modal__pin-card pin-modal__pin-card--scorer">
                <div className="pin-modal__pin-label">計分碼</div>
                <div className="pin-modal__pin-code pin-modal__pin-code--scorer">
                  {scorerPin}
                </div>
                <ul className="pin-modal__pin-desc">
                  <li>只給志工計分員使用</li>
                  <li>請勿公開分享</li>
                  <li>請私下告訴志工</li>
                </ul>
                <div className="pin-modal__actions">
                  <button
                    onClick={() => handleCopyPin(scorerPin, "計分")}
                    className="pin-modal__btn pin-modal__btn--scorer"
                  >
                    複製
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 滑動指示器 */}
        <div className="pin-modal__dots">
          <button
            className={`pin-modal__dot ${
              currentSlide === 0 ? "pin-modal__dot--active" : ""
            }`}
            onClick={() => setCurrentSlide(0)}
          />
          <button
            className={`pin-modal__dot ${
              currentSlide === 1 ? "pin-modal__dot--active" : ""
            }`}
            onClick={() => setCurrentSlide(1)}
          />
        </div>
      </div>
    </div>
  );
}
