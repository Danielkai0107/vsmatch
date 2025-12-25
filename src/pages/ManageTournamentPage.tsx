import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useTournamentById } from "../hooks/useFirestore";
import { useTournamentStore } from "../stores/tournamentStore";
import { useAuth } from "../contexts/AuthContext";
import { generatePin } from "../utils/pinCode";
import { getSportById, getFormatById } from "../config/sportsData";
import { mapPlayersToMatches } from "../utils/bracketLogic";
import { getSetsFormatLabel } from "../types";

export function ManageTournamentPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showScorerPin, setShowScorerPin] = useState(false);

  useTournamentById(id);
  const { currentTournament } = useTournamentStore();

  if (!currentTournament) {
    return <div className="text-center py-12">載入中...</div>;
  }

  const isOrganizer = user?.uid === currentTournament.organizerId;

  if (!isOrganizer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">您沒有權限管理此比賽</p>
        <Link to="/profile" className="text-blue-600 hover:underline mt-4 inline-block">
          返回個人資料
        </Link>
      </div>
    );
  }

  const sport = getSportById(currentTournament.config.sportId);
  const rule = currentTournament.config.rules;

  const handleStartTournament = async () => {
    if (!id) return;

    if (
      !confirm("確定要開始比賽嗎？開始後將不再接受報名且無法修改規則。")
    ) {
      return;
    }

    setLoading(true);

    try {
      const format = getFormatById(currentTournament.config.formatId);
      if (!format) {
        alert("找不到比賽格式");
        return;
      }

      // 生成對戰表
      const initialMatches = mapPlayersToMatches(
        format,
        currentTournament.players
      );

      // 將每場比賽保存到 Firestore 的 matches 子集合
      const savePromises = Object.entries(initialMatches).map(
        ([matchId, match]) => {
          const matchRef = doc(db, "tournaments", id, "matches", matchId);
          return setDoc(matchRef, {
            ...match,
            matchId,
            tournamentId: id,
          });
        }
      );

      await Promise.all(savePromises);

      // 更新比賽狀態為 live
      await updateDoc(doc(db, "tournaments", id), {
        status: "live",
      });

      alert("比賽已開始！");
      navigate("/profile");
    } catch (error) {
      console.error("Error starting tournament:", error);
      alert("開始比賽失敗，請重試");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateScorerPin = async () => {
    if (!id) return;
    if (
      !confirm(
        "確定要重新生成計分 PIN 碼嗎？已授權的計分員需要重新輸入新的 PIN。"
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const newScorerPin = await generatePin();
      await updateDoc(doc(db, "tournaments", id), {
        scorerPin: newScorerPin,
      });
      alert(`新的計分 PIN 碼：${newScorerPin}`);
      // 重新載入頁面以更新 PIN
      window.location.reload();
    } catch (error) {
      console.error("Error regenerating scorer PIN:", error);
      alert("重新生成失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("確定要刪除此比賽嗎？此操作無法復原！")) {
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, "tournaments", id));
      alert("比賽已刪除");
      navigate("/profile");
    } catch (error) {
      console.error("Error deleting tournament:", error);
      alert("刪除失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Link
        to="/profile"
        className="inline-block mb-4 text-blue-600 hover:underline text-sm"
      >
        ← 返回個人資料
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">管理比賽</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* 比賽基本資訊 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">
              {currentTournament.name}
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                currentTournament.status === "draft"
                  ? "bg-gray-200 text-gray-700"
                  : currentTournament.status === "live"
                  ? "bg-green-200 text-green-700"
                  : "bg-blue-200 text-blue-700"
              }`}
            >
              {currentTournament.status === "draft"
                ? "籌備中"
                : currentTournament.status === "live"
                ? "進行中"
                : "已結束"}
            </span>
          </div>
          <div className="flex items-center gap-4 text-gray-600">
            <span className="text-xl">{sport?.icon}</span>
            <span>{sport?.name}</span>
            <span>•</span>
            <span>{rule ? getSetsFormatLabel(rule) : ""}</span>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex gap-3">
            <Link
              to={`/tournament/${id}/edit`}
              className="flex-1 px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold text-center"
            >
              編輯比賽資料
            </Link>
            <Link
              to={`/tournament/${id}`}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-center"
            >
              預覽公開頁面
            </Link>
          </div>
        </div>

        {/* PIN 碼管理 */}
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-gray-900 mb-4">PIN 碼管理</h3>

          <div className="space-y-3">
            {/* 比賽 PIN */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">
                比賽 PIN 碼（公開）
              </div>
              <div className="text-3xl font-bold text-blue-600 font-mono">
                {currentTournament.pin}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                給選手報名和觀眾查看使用
              </div>
            </div>

            {/* 計分 PIN */}
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-2 flex justify-between items-center">
                <span>計分 PIN 碼（私密）</span>
                <button
                  onClick={() => setShowScorerPin(!showScorerPin)}
                  className="text-xs text-red-600 hover:underline font-semibold"
                >
                  {showScorerPin ? "隱藏" : "顯示"}
                </button>
              </div>
              <div className="text-3xl font-bold text-red-600 font-mono mb-3">
                {showScorerPin ? currentTournament.scorerPin : "••••••"}
              </div>
              <button
                onClick={handleRegenerateScorerPin}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 text-sm font-semibold"
              >
                重新生成計分 PIN
              </button>
            </div>
          </div>
        </div>

        {/* 已報名選手 */}
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            已報名選手（{currentTournament.players.length} /{" "}
            {getFormatById(currentTournament.config.formatId)?.totalSlots || 0}{" "}
            人）
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg max-h-80 overflow-y-auto">
            {currentTournament.players.length === 0 ? (
              <p className="text-gray-500 text-center">尚無選手報名</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {currentTournament.players.map((player, index) => (
                  <div
                    key={index}
                    className="bg-white p-3 rounded-lg border border-gray-200 text-sm font-medium"
                  >
                    {index + 1}. {player.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 開始比賽（僅籌備中） */}
        {currentTournament.status === "draft" && (
          <div className="p-6 border-b bg-purple-50">
            <h3 className="text-xl font-bold text-purple-600 mb-3">
              🚀 開始比賽
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              點擊後將鎖定報名、生成對戰表，比賽正式開始
            </p>
            <button
              onClick={handleStartTournament}
              disabled={loading || currentTournament.players.length < 2}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {loading ? "處理中..." : "開始比賽"}
            </button>
            {currentTournament.players.length < 2 && (
              <p className="text-sm text-red-600 mt-2 text-center">
                至少需要 2 位選手才能開始比賽
              </p>
            )}
          </div>
        )}

        {/* 危險操作 */}
        <div className="p-6 bg-red-50">
          <h3 className="text-xl font-bold text-red-600 mb-3">危險操作</h3>
          <p className="text-sm text-gray-600 mb-4">
            刪除後無法復原，請謹慎操作
          </p>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 font-semibold"
          >
            刪除比賽
          </button>
        </div>
      </div>
    </div>
  );
}

