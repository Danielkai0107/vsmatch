import { useParams, Link } from 'react-router-dom';
import { useTournamentById, useMatches } from '../hooks/useFirestore';
import { useTournamentStore } from '../stores/tournamentStore';
import { useMatchStore } from '../stores/matchStore';
import { BracketView } from '../components/bracket/BracketView';
import { getSportById, getFormatById } from '../config/sportsData';
import { mapPlayersToMatches } from '../utils/bracketLogic';
import type { Match } from '../types';

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();

  useTournamentById(id);
  useMatches(id);

  const { currentTournament, loading } = useTournamentStore();
  const { matches } = useMatchStore();

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">載入中...</p>
      </div>
    );
  }

  if (!currentTournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">找不到此比賽</p>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
          返回首頁
        </Link>
      </div>
    );
  }

  const sport = getSportById(currentTournament.config.sportId);
  const format = getFormatById(currentTournament.config.formatId);

  // 如果還沒有 matches，從 format 創建初始對戰表
  const displayMatches =
    Object.keys(matches).length > 0
      ? matches
      : (format
      ? mapPlayersToMatches(format, currentTournament.players)
      : {}) as Record<string, Match>;

  return (
    <div>
      <Link to="/" className="inline-block mb-4 text-blue-600 hover:underline">
        ← 返回首頁
      </Link>
      
      {/* 簡化的頂部資訊區 - 只顯示基本資訊 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {currentTournament.name}
            </h1>
            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{sport?.icon}</span>
                <span>{sport?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {currentTournament.status === 'draft'
                    ? "📋 報名中"
                    : currentTournament.status === 'live'
                    ? "🔴 進行中"
                    : "✅ 已結束"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PIN 碼資訊 - 只顯示比賽 PIN */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4 max-w-md">
          <div className="text-sm text-gray-600 mb-1">比賽 PIN 碼</div>
          <div className="text-2xl font-bold text-blue-600 font-mono">
            {currentTournament.pin}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            給選手報名和觀眾查看使用
          </div>
        </div>

        {/* 報名按鈕 - 只在籌備階段顯示 */}
        {currentTournament.status === 'draft' && (
          <Link
            to="/join"
            state={{ pin: currentTournament.pin }}
            className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            報名參賽
          </Link>
        )}
      </div>

      {/* 對戰表 */}
      {format && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">對戰表</h2>
          <BracketView
            format={format}
            matches={displayMatches}
            tournamentId={id || ''}
          />
        </div>
      )}
    </div>
  );
}

