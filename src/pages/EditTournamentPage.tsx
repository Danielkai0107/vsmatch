import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { useTournamentById } from "../hooks/useFirestore";
import { useTournamentStore } from "../stores/tournamentStore";
import {
  getAllSports,
  getAllFormats,
  getSportById,
  getFormatById,
} from "../config/sportsData";
import type { Sport, TournamentFormat, RuleConfig } from "../types";
import { SETS_OPTIONS } from "../types";
import { ArrowLeft } from "lucide-react";
import "./CreateTournamentPage.scss";

export function EditTournamentPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  useTournamentById(id);
  const { currentTournament } = useTournamentStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // 表單資料 - 從現有比賽自動帶入
  const [tournamentName, setTournamentName] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [selectedSetsOption, setSelectedSetsOption] = useState<string>("bo3");
  const [scoreToWin, setScoreToWin] = useState<number>(21);
  const [tiebreakerScore, setTiebreakerScore] = useState<number>(15);
  const [useTiebreaker, setUseTiebreaker] = useState<boolean>(false);
  const [selectedFormat, setSelectedFormat] = useState<TournamentFormat | null>(
    null
  );

  const sports = getAllSports();
  const formats = getAllFormats();

  // 自動帶入現有資料
  useEffect(() => {
    if (currentTournament) {
      setTournamentName(currentTournament.name);
      setSelectedRegion(currentTournament.region || "");
      setSelectedOrganization(currentTournament.organization || "");

      const sport = getSportById(currentTournament.config.sportId);
      setSelectedSport(sport);

      const format = getFormatById(currentTournament.config.formatId);
      setSelectedFormat(format);

      const rules = currentTournament.config.rules;
      if (rules) {
        setScoreToWin(rules.scoreToWin || 21);
        setTiebreakerScore(rules.tiebreaker?.scoreToWin || 15);
        setUseTiebreaker(!!rules.tiebreaker);

        // 根據 rules 找到對應的 setsOption
        const matchingOption = SETS_OPTIONS.find(
          (opt) =>
            opt.setsToWin === rules.setsToWin &&
            opt.totalSets === rules.totalSets
        );
        if (matchingOption) {
          setSelectedSetsOption(matchingOption.id);
        }
      }
    }
  }, [currentTournament]);

  if (!currentTournament) {
    return <div className="text-center py-12">載入中...</div>;
  }

  const isOrganizer = user?.uid === currentTournament.organizerId;

  if (!isOrganizer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">您沒有權限編輯此比賽</p>
      </div>
    );
  }

  const isLocked = currentTournament.status !== "draft";

  const handleUpdate = async () => {
    if (!id || !selectedSport || !selectedSetsOption || !selectedFormat) {
      return;
    }

    setLoading(true);

    try {
      const setsOption = SETS_OPTIONS.find(
        (opt) => opt.id === selectedSetsOption
      );
      if (!setsOption) return;

      // 構建規則配置
      const ruleConfig: RuleConfig = {
        scoreToWin: setsOption.scoringMode === "cumulative" ? 0 : scoreToWin,
        setsToWin: setsOption.setsToWin,
        totalSets: setsOption.totalSets,
        scoringMode: setsOption.scoringMode,
        allowOvertime: setsOption.allowOvertime,
        tiebreaker:
          useTiebreaker && setsOption.scoringMode === "sets"
            ? { scoreToWin: tiebreakerScore }
            : null,
      };

      await updateDoc(doc(db, "tournaments", id), {
        name: tournamentName,
        region: selectedRegion,
        organization: selectedOrganization,
        config: {
          sportId: selectedSport.id,
          formatId: selectedFormat.id,
          rules: ruleConfig,
        },
        updatedAt: Timestamp.now(),
      });

      alert("更新成功！");
      navigate("/profile");
    } catch (error) {
      console.error("Error updating tournament:", error);
      alert("更新失敗，請重試");
    } finally {
      setLoading(false);
    }
  };

  // 如果尚未登入
  if (!user) {
    return (
      <div className="login-prompt">
        <h2 className="login-prompt__title">請先登入</h2>
        <p className="login-prompt__text">您需要登入才能編輯比賽</p>
      </div>
    );
  }

  // 編輯比賽表單 - 使用跟創建一樣的流程
  return (
    <div className="create-tournament">
      <button
        onClick={() => navigate("/profile")}
        className="create-tournament__back-btn"
      >
        <ArrowLeft />
      </button>
      <h1 className="create-tournament__title">編輯比賽</h1>

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

        {/* 步驟 1: 比賽基本資訊 */}
        {step === 1 && (
          <div className="create-tournament__section">
            <h2>1. 比賽基本資訊</h2>

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
            {isLocked && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  比賽已開始，無法修改運動項目
                </p>
              </div>
            )}
            <div className="create-tournament__grid create-tournament__grid--2cols">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => !isLocked && setSelectedSport(sport)}
                  disabled={isLocked}
                  className={`create-tournament__select-btn ${
                    selectedSport?.id === sport.id
                      ? "create-tournament__select-btn--selected"
                      : "create-tournament__select-btn--unselected"
                  } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
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
            {isLocked && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  比賽已開始，無法修改規則
                </p>
              </div>
            )}

            {/* 局數制度選擇 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                a. 局數制度
              </label>
              <div className="create-tournament__grid create-tournament__grid--3cols">
                {SETS_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() =>
                      !isLocked && setSelectedSetsOption(option.id)
                    }
                    disabled={isLocked}
                    className={`create-tournament__rule-btn ${
                      selectedSetsOption === option.id
                        ? "create-tournament__rule-btn--selected"
                        : "create-tournament__rule-btn--unselected"
                    } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
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
                    disabled={isLocked}
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
                    disabled={isLocked}
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
                      disabled={isLocked}
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

            {isLocked && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  比賽已開始，無法修改比賽格式
                </p>
              </div>
            )}

            <div className="create-tournament__grid create-tournament__grid--3cols">
              {formats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => !isLocked && setSelectedFormat(format)}
                  disabled={isLocked}
                  className={`create-tournament__select-btn ${
                    selectedFormat?.id === format.id
                      ? "create-tournament__select-btn--selected"
                      : "create-tournament__select-btn--unselected"
                  } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
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
                onClick={handleUpdate}
                disabled={!selectedFormat || loading}
                className="create-tournament__btn create-tournament__btn--success"
              >
                {loading ? "更新中..." : "儲存變更"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
