import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { getAllSports, getAllFormats } from "../config/sportsData";
import { generatePinPair } from "../utils/pinCode";
import type { Sport, TournamentFormat, RuleConfig } from "../types";
import { SETS_OPTIONS } from "../types";
import { ArrowLeft } from "lucide-react";
import "./CreateTournamentPage.scss";

export function CreateTournamentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // 表單資料
  const [tournamentName, setTournamentName] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [selectedSetsOption, setSelectedSetsOption] = useState<string>("bo3"); // 預設3局2勝
  const [scoreToWin, setScoreToWin] = useState<number>(21); // 預設21分
  const [tiebreakerScore, setTiebreakerScore] = useState<number>(15); // 決勝局分數
  const [useTiebreaker, setUseTiebreaker] = useState<boolean>(false); // 是否使用決勝局
  const [selectedFormat, setSelectedFormat] = useState<TournamentFormat | null>(
    null
  );

  // 建立成功後的 PIN 碼
  const [createdPins, setCreatedPins] = useState<{
    pin: string;
    scorerPin: string;
    tournamentId: string;
  } | null>(null);

  const sports = getAllSports();
  const formats = getAllFormats();

  const handleCreate = async () => {
    if (!user || !selectedSport || !selectedSetsOption || !selectedFormat) {
      return;
    }

    setLoading(true);

    try {
      const { pin, scorerPin } = await generatePinPair();

      // 獲取選中的局數制度配置
      const setsOption = SETS_OPTIONS.find(
        (opt) => opt.id === selectedSetsOption
      );
      if (!setsOption) return;

      // 構建規則配置
      const ruleConfig: RuleConfig = {
        scoreToWin: setsOption.scoringMode === "cumulative" ? 0 : scoreToWin, // 累計制不使用單局分數
        setsToWin: setsOption.setsToWin,
        totalSets: setsOption.totalSets,
        scoringMode: setsOption.scoringMode,
        allowOvertime: setsOption.allowOvertime,
        tiebreaker:
          useTiebreaker && setsOption.scoringMode === "sets"
            ? { scoreToWin: tiebreakerScore }
            : null,
      };

      const newTournament = {
        pin,
        scorerPin,
        name: tournamentName,
        region: selectedRegion,
        organization: selectedOrganization,
        organizerId: user.uid,
        status: "draft",
        config: {
          sportId: selectedSport.id,
          formatId: selectedFormat.id,
          rules: ruleConfig,
        },
        players: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "tournaments"), newTournament);

      setCreatedPins({
        pin,
        scorerPin,
        tournamentId: docRef.id,
      });
    } catch (error) {
      console.error("Error creating tournament:", error);
      alert("建立比賽失敗，請重試");
    } finally {
      setLoading(false);
    }
  };

  // 如果尚未登入
  if (!user) {
    return (
      <div className="login-prompt">
        <h2 className="login-prompt__title">請先登入</h2>
        <p className="login-prompt__text">您需要登入才能建立比賽</p>
      </div>
    );
  }

  // 顯示建立成功畫面
  if (createdPins) {
    return (
      <div className="create-success">
        <div className="create-success__card">
          <div className="create-success__header">
            <div className="create-success__icon"></div>
            <h2 className="create-success__title">比賽建立成功！</h2>
          </div>

          <div className="create-success__pins">
            {/* 比賽 PIN */}
            <div className="create-success__pin-box create-success__pin-box--public">
              <div className="create-success__pin-header">
                <span></span>
                <h3>比賽 PIN 碼（公開分享）</h3>
              </div>
              <div className="create-success__pin-code create-success__pin-code--public">
                {createdPins.pin}
              </div>
              <ul className="create-success__pin-list">
                <li>→ 給選手報名使用</li>
                <li>→ 給觀眾查看對戰表使用</li>
                <li>→ 可以公開張貼</li>
              </ul>
            </div>

            {/* 計分 PIN */}
            <div className="create-success__pin-box create-success__pin-box--private">
              <div className="create-success__pin-header">
                <span></span>
                <h3>計分 PIN 碼（私密保管）</h3>
              </div>
              <div className="create-success__pin-code create-success__pin-code--private">
                {createdPins.scorerPin}
              </div>
              <ul className="create-success__pin-list">
                <li>→ 只給志工計分員使用</li>
                <li>→ 請勿公開分享</li>
                <li>→ 請私下告訴志工</li>
              </ul>
            </div>
          </div>

          <div className="create-success__copy-actions">
            <button
              onClick={() => navigator.clipboard.writeText(createdPins.pin)}
              className="create-success__copy-btn create-success__copy-btn--public"
            >
              複製比賽 PIN
            </button>
            <button
              onClick={() =>
                navigator.clipboard.writeText(createdPins.scorerPin)
              }
              className="create-success__copy-btn create-success__copy-btn--private"
            >
              複製計分 PIN
            </button>
          </div>

          <button
            onClick={() => navigate(`/tournament/${createdPins.tournamentId}`)}
            className="create-success__go-btn"
          >
            前往對戰表 →
          </button>
        </div>
      </div>
    );
  }

  // 建立比賽表單
  return (
    <div className="create-tournament">
      <button
        onClick={() => navigate("/")}
        className="create-tournament__back-btn"
      >
        <ArrowLeft />
      </button>
      <h1 className="create-tournament__title">建立新比賽</h1>

      <div className="create-tournament__card">
        {/* 步驟指示器 */}
        <div className="create-tournament__stepper">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="create-tournament__step-item">
              <div
                className={`create-tournament__step-circle ${
                  s <= step
                    ? "create-tournament__step-circle--active"
                    : "create-tournament__step-circle--inactive"
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className={`create-tournament__step-line ${
                    s < step
                      ? "create-tournament__step-line--active"
                      : "create-tournament__step-line--inactive"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* 步驟 1: 輸入比賽基本資訊 */}
        {step === 1 && (
          <div className="create-tournament__section">
            <h2>1. 輸入比賽基本資訊</h2>

            {/* 比賽名稱 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                比賽名稱 *
              </label>
              <input
                type="text"
                placeholder="例如：2025 春季羽球賽"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                className="create-tournament__input"
                autoFocus
              />
            </div>

            {/* 地區選擇 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                地區
              </label>
              <div className="create-tournament__grid create-tournament__grid--3cols">
                {["北部", "中部", "南部"].map((region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setSelectedRegion(region)}
                    className={`create-tournament__select-btn ${
                      selectedRegion === region
                        ? "create-tournament__select-btn--selected"
                        : "create-tournament__select-btn--unselected"
                    }`}
                  >
                    <div className="create-tournament__select-btn-title">
                      {region}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 單位選擇 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                單位
              </label>
              <div className="create-tournament__grid create-tournament__grid--3cols">
                {["社團", "學校", "公司", "個人", "業餘"].map((org) => (
                  <button
                    key={org}
                    type="button"
                    onClick={() => setSelectedOrganization(org)}
                    className={`create-tournament__select-btn ${
                      selectedOrganization === org
                        ? "create-tournament__select-btn--selected"
                        : "create-tournament__select-btn--unselected"
                    }`}
                  >
                    <div className="create-tournament__select-btn-title">
                      {org}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="create-tournament__actions">
              <button
                onClick={() => setStep(2)}
                disabled={!tournamentName.trim()}
                className="create-tournament__btn create-tournament__btn--primary"
              >
                下一步
              </button>
            </div>
          </div>
        )}

        {/* 步驟 2: 選擇運動 */}
        {step === 2 && (
          <div className="create-tournament__section">
            <h2>2. 選擇運動項目</h2>
            <div className="create-tournament__grid create-tournament__grid--2cols">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => setSelectedSport(sport)}
                  className={`create-tournament__select-btn ${
                    selectedSport?.id === sport.id
                      ? "create-tournament__select-btn--selected"
                      : "create-tournament__select-btn--unselected"
                  }`}
                >
                  <div className="create-tournament__select-btn-icon">
                    {sport.icon}
                  </div>
                  <div className="create-tournament__select-btn-title">
                    {sport.name}
                  </div>
                </button>
              ))}
            </div>
            <div className="create-tournament__actions">
              <button
                onClick={() => setStep(1)}
                className="create-tournament__btn create-tournament__btn--secondary"
              >
                上一步
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedSport}
                className="create-tournament__btn create-tournament__btn--primary"
              >
                下一步
              </button>
            </div>
          </div>
        )}

        {/* 步驟 3: 設定賽制規則 */}
        {step === 3 && selectedSport && (
          <div className="create-tournament__section">
            <h2>3. 設定賽制規則</h2>

            {/* 局數制度選擇 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                a. 局數制度
              </label>
              <div className="create-tournament__grid create-tournament__grid--3cols">
                {SETS_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedSetsOption(option.id)}
                    className={`create-tournament__rule-btn ${
                      selectedSetsOption === option.id
                        ? "create-tournament__rule-btn--selected"
                        : "create-tournament__rule-btn--unselected"
                    }`}
                  >
                    <div className="create-tournament__rule-btn-title">
                      {option.label}
                    </div>
                    <div className="create-tournament__rule-btn-desc">
                      {option.scoringMode === "cumulative"
                        ? `打滿${option.totalSets}局・總分制`
                        : option.id === "single"
                        ? "1局定勝負"
                        : `需贏${option.setsToWin}局`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 單局分數設定（僅單局制） */}
            {SETS_OPTIONS.find((opt) => opt.id === selectedSetsOption)
              ?.scoringMode === "sets" && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  b. 單局目標分數
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={scoreToWin}
                    onChange={(e) => setScoreToWin(Number(e.target.value))}
                    className="create-tournament__input w-32 text-center text-2xl font-bold"
                  />
                  <span className="text-gray-600">分</span>
                  <span className="text-xs text-gray-500 ml-4">
                    （建議：羽球21、籃球21、排球25、網球6）
                  </span>
                </div>
              </div>
            )}

            {/* 決勝局設定（僅單局制） */}
            {SETS_OPTIONS.find((opt) => opt.id === selectedSetsOption)
              ?.scoringMode === "sets" && (
              <div className="mb-6">
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={useTiebreaker}
                    onChange={(e) => setUseTiebreaker(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    啟用決勝局特殊分數（例如排球決勝局15分）
                  </span>
                </label>
                {useTiebreaker && (
                  <div className="flex items-center gap-4 ml-7">
                    <span className="text-sm text-gray-600">
                      決勝局目標分數：
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={tiebreakerScore}
                      onChange={(e) =>
                        setTiebreakerScore(Number(e.target.value))
                      }
                      className="create-tournament__input w-24 text-center text-xl font-bold"
                    />
                    <span className="text-gray-600">分</span>
                  </div>
                )}
              </div>
            )}

            {/* 累計制說明 */}
            {SETS_OPTIONS.find((opt) => opt.id === selectedSetsOption)
              ?.scoringMode === "cumulative" && (
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 text-xl"></span>
                    <div className="text-sm text-blue-900">
                      <strong>總分累計制：</strong>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>所有局的分數會累計加總</li>
                        <li>打完固定局數後，總分高者獲勝</li>
                        <li>總分相同時自動進入延長賽，直到分出勝負</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 預覽規則 */}
            <div className="create-tournament__preview">
              <p>
                <strong>規則預覽：</strong>
                {
                  SETS_OPTIONS.find((opt) => opt.id === selectedSetsOption)
                    ?.label
                }
                {SETS_OPTIONS.find((opt) => opt.id === selectedSetsOption)
                  ?.scoringMode === "sets" && `，每局打到 ${scoreToWin} 分`}
                {useTiebreaker && `（決勝局 ${tiebreakerScore} 分）`}
              </p>
            </div>

            <div className="create-tournament__actions">
              <button
                onClick={() => setStep(2)}
                className="create-tournament__btn create-tournament__btn--secondary"
              >
                上一步
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!selectedSetsOption || scoreToWin < 1}
                className="create-tournament__btn create-tournament__btn--primary"
              >
                下一步
              </button>
            </div>
          </div>
        )}

        {/* 步驟 4: 選擇比賽格式 */}
        {step === 4 && (
          <div className="create-tournament__section">
            <h2>4. 選擇比賽格式</h2>
            <div className="create-tournament__grid create-tournament__grid--3cols">
              {formats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format)}
                  className={`create-tournament__select-btn ${
                    selectedFormat?.id === format.id
                      ? "create-tournament__select-btn--selected"
                      : "create-tournament__select-btn--unselected"
                  }`}
                >
                  <div className="create-tournament__select-btn-title">
                    {format.name}
                  </div>
                  <div className="create-tournament__select-btn-desc">
                    {format.totalSlots} 組
                  </div>
                </button>
              ))}
            </div>

            {selectedFormat && (
              <div className="create-tournament__preview">
                <p>
                  <strong>預覽：</strong> {selectedFormat.name} 共有{" "}
                  {selectedFormat.stages.length} 輪，需要{" "}
                  {selectedFormat.totalSlots} 位選手。
                </p>
              </div>
            )}

            <div className="create-tournament__actions">
              <button
                onClick={() => setStep(3)}
                className="create-tournament__btn create-tournament__btn--secondary"
              >
                上一步
              </button>
              <button
                onClick={handleCreate}
                disabled={!selectedFormat || loading}
                className="create-tournament__btn create-tournament__btn--success"
              >
                {loading ? "建立中..." : "確認建立"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
