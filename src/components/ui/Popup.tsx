import React from "react";
import "./Popup.scss";

interface PopupProps {
  message: string;
  onClose: () => void;
  type?: "info" | "success" | "warning" | "error";
  mode?: "alert" | "confirm";
  onConfirm?: () => void;
}

const Popup: React.FC<PopupProps> = ({
  message,
  onClose,
  type = "info",
  mode = "alert",
  onConfirm,
}) => {
  return (
    <div
      className="popup-overlay"
      onClick={mode === "alert" ? onClose : undefined}
    >
      <div className="popup-container" onClick={(e) => e.stopPropagation()}>
        <div className={`popup-content popup-${type}`}>
          <div className="popup-message">
            {message.split("\n").map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
          {mode === "alert" ? (
            <button className="popup-button" onClick={onClose}>
              確定
            </button>
          ) : (
            <div className="popup-buttons">
              <button
                className="popup-button popup-button--cancel"
                onClick={onClose}
              >
                取消
              </button>
              <button
                className="popup-button popup-button--confirm"
                onClick={onConfirm}
              >
                確定
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Popup;
