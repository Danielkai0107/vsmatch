import type {
  TournamentFormat,
  Player,
  Match,
} from '../types';

/**
 * 將選手映射到對戰表的比賽位置
 * @param format 比賽格式
 * @param players 已報名的選手列表
 * @returns 完整的比賽對象映射
 */
export function mapPlayersToMatches(
  format: TournamentFormat,
  players: Player[]
): Record<string, Partial<Match>> {
  const matches: Record<string, Partial<Match>> = {};

  // 遍歷所有輪次
  format.stages.forEach((stage) => {
    stage.matches.forEach((formatMatch) => {
      const match: Partial<Match> = {
        matchId: formatMatch.id,
        player1: null,
        player2: null,
        sets: [],
        currentSet: 0,
        winner: null,
        status: 'pending',
        nextMatchId: formatMatch.next,
      };

      // 第一輪比賽：根據 p1_source 和 p2_source 填入選手
      if (
        formatMatch.p1_source !== undefined &&
        formatMatch.p2_source !== undefined
      ) {
        const p1 = players[formatMatch.p1_source];
        const p2 = players[formatMatch.p2_source];

        match.player1 = p1
          ? { name: p1.name, source: formatMatch.p1_source }
          : null;
        match.player2 = p2
          ? { name: p2.name, source: formatMatch.p2_source }
          : null;

        // 如果雙方選手都存在，狀態改為 pending
        if (p1 && p2) {
          match.status = 'pending';
        }
      }
      // 後續輪次：選手來自前一輪的勝者
      else {
        match.status = 'pending';
      }

      matches[formatMatch.id] = match;
    });
  });

  return matches;
}

/**
 * 建立反向映射：找出哪些比賽的勝者會進入指定比賽
 * @param format 比賽格式
 * @returns 比賽ID -> 來源比賽IDs 的映射
 */
export function buildSourceMapping(
  format: TournamentFormat
): Record<string, { p1_from?: string; p2_from?: string }> {
  const mapping: Record<string, { p1_from?: string; p2_from?: string }> = {};

  format.stages.forEach((stage) => {
    // 按照比賽分組（每兩場進入同一場下一輪比賽）
    const matchesGrouped: Record<string, string[]> = {};

    stage.matches.forEach((match) => {
      if (match.next) {
        if (!matchesGrouped[match.next]) {
          matchesGrouped[match.next] = [];
        }
        matchesGrouped[match.next].push(match.id);
      }
    });

    // 為每組設置 p1_from 和 p2_from
    Object.entries(matchesGrouped).forEach(([nextMatch, sourceMatches]) => {
      if (sourceMatches.length === 2) {
        // 標準情況：兩場比賽晉級到下一場
        mapping[nextMatch] = {
          p1_from: sourceMatches[0],
          p2_from: sourceMatches[1],
        };
      } else if (sourceMatches.length === 1) {
        // 輪空情況：只有一場比賽晉級
        mapping[nextMatch] = {
          p1_from: sourceMatches[0],
          p2_from: undefined,
        };
      }
      // 如果有其他數量的來源比賽，可以根據需要擴展邏輯
    });
  });

  return mapping;
}

/**
 * 獲取比賽的輪次名稱
 * @param format 比賽格式
 * @param matchId 比賽ID
 * @returns 輪次名稱
 */
export function getMatchRoundName(
  format: TournamentFormat,
  matchId: string
): string {
  for (const stage of format.stages) {
    const match = stage.matches.find((m) => m.id === matchId);
    if (match) {
      return stage.name;
    }
  }
  return '';
}

/**
 * 檢查比賽是否可以開始（兩位選手都已確定）
 * @param match 比賽對象
 * @returns 是否可以開始
 */
export function canMatchStart(match: Partial<Match>): boolean {
  return match.player1 !== null && match.player2 !== null;
}

/**
 * 獲取空位數量
 * @param format 比賽格式
 * @param players 已報名的選手
 * @returns 剩餘空位數
 */
export function getAvailableSlots(
  format: TournamentFormat,
  players: Player[]
): number {
  return format.totalSlots - players.length;
}

