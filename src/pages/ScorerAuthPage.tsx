import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { validateScorerPin } from "../utils/pinCode";
import { usePermissionStore } from "../stores/permissionStore";
import { ArrowLeft } from "lucide-react";
import "./ScorerAuthPage.scss";

export function ScorerAuthPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const grantScorePermission = usePermissionStore(
    (state) => state.grantScorePermission
  );

  const handleSubmit = async (overridePin?: string) => {
    const finalPin = overridePin || pin;
    if (!id) return;

    if (finalPin.length !== 6) {
      setError("計分 PIN 碼必須是6位數");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const isValid = await validateScorerPin(id, finalPin);

      if (isValid) {
        // 授予權限
        grantScorePermission(id, finalPin);

        // 返回比賽頁面
        navigate(`/tournament/${id}`);
      } else {
        setError("計分 PIN 碼不正確，請向主辦人確認");
      }
    } catch (error) {
      console.error("Error validating PIN:", error);
      setError("驗證失敗，請重試");
    } finally {
      setLoading(false);
    }
  };

  // 如果 URL 中有 PIN，自動提交
  useEffect(() => {
    const urlPin = searchParams.get("pin");
    if (urlPin && urlPin.length === 6) {
      handleSubmit(urlPin);
    }
  }, [id]); // 僅在載入時執行一次

  return (
    <div className="scorer-auth">
      <button 
        onClick={() => navigate(`/tournament/${id}`)}
        className="scorer-auth__back-btn "
      >
        <ArrowLeft />
      </button>
      <div className="scorer-auth__card">
        <div className="scorer-auth__header">
          <div className="scorer-auth__icon"></div>
          <h2 className="scorer-auth__title">計分員授權</h2>
          <p className="scorer-auth__subtitle">
            請輸入<strong>計分 PIN 碼</strong>以獲得計分權限
          </p>
        </div>

        <div className="scorer-auth__content">
          <div className="scorer-auth__info-box">
            <p>
              <strong>說明：</strong>
            </p>
            <ul>
              <li>此 PIN 碼由主辦人提供，與比賽 PIN 不同</li>
              <li>志工計分員可以點擊對戰表上的任何場次進行計分</li>
              <li>計分權限會保存在您的瀏覽器中</li>
            </ul>
          </div>

          <div className="scorer-auth__form-group">
            <label>計分 PIN 碼（私密）</label>
            <input
              type="text"
              placeholder="輸入 6 位數 PIN 碼"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              className="scorer-auth__pin-input"
              maxLength={6}
              autoFocus
            />
            {error && <p className="scorer-auth__error">{error}</p>}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={pin.length !== 6 || loading}
          className="scorer-auth__submit-btn"
        >
          {loading ? "驗證中..." : "確認授權"}
        </button>

        <div className="scorer-auth__warning">
          <p>
            如果您是要<strong>報名參賽</strong>，請使用
            <strong>比賽 PIN 碼</strong>，不是計分 PIN 碼
          </p>
        </div>
      </div>
    </div>
  );
}
