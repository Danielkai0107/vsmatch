import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Match, PlayerRef, TournamentFormat } from '../types';
import { buildSourceMapping } from './bracketLogic';

/**
 * 處理勝者晉級到下一輪
 * @param tournamentId 比賽ID
 * @param completedMatchId 完成的比賽ID
 * @param winner 勝者
 * @param format 比賽格式
 */
export async function progressWinner(
  tournamentId: string,
  completedMatchId: string,
  winner: PlayerRef,
  format: TournamentFormat
): Promise<void> {
  try {
    // 獲取完成的比賽資料
    const completedMatchRef = doc(
      db,
      'tournaments',
      tournamentId,
      'matches',
      completedMatchId
    );
    const completedMatchSnap = await getDoc(completedMatchRef);

    if (!completedMatchSnap.exists()) {
      throw new Error('比賽不存在');
    }

    const completedMatch = completedMatchSnap.data() as Match;

    // 確認比賽已完成
    if (completedMatch.status !== 'completed') {
      throw new Error('比賽尚未完成');
    }

    // 獲取下一場比賽ID
    const nextMatchId = completedMatch.nextMatchId;

    if (!nextMatchId) {
      // 這是決賽，沒有下一場比賽
      console.log('比賽結束！冠軍：', winner.name);
      return;
    }

    // 建立來源映射
    const sourceMapping = buildSourceMapping(format);
    const nextMatchMapping = sourceMapping[nextMatchId];

    if (!nextMatchMapping) {
      throw new Error('無法找到下一場比賽的來源映射');
    }

    // 判斷勝者應該進入下一場比賽的 p1 還是 p2
    const isP1 = nextMatchMapping.p1_from === completedMatchId;
    const isP2 = nextMatchMapping.p2_from === completedMatchId;

    if (!isP1 && !isP2) {
      throw new Error('無法確定勝者在下一場比賽的位置');
    }

    // 更新下一場比賽
    const nextMatchRef = doc(
      db,
      'tournaments',
      tournamentId,
      'matches',
      nextMatchId
    );

    const updateData = isP1
      ? { player1: winner }
      : { player2: winner };

    await updateDoc(nextMatchRef, updateData);

    console.log(
      `✅ ${winner.name} 晉級到 ${nextMatchId} 的 ${isP1 ? 'P1' : 'P2'} 位置`
    );
  } catch (error) {
    console.error('晉級處理失敗:', error);
    throw error;
  }
}

/**
 * 檢查是否需要處理輪空（bye）
 * 如果對手不存在，自動晉級
 * @param tournamentId 比賽ID
 * @param match 比賽對象
 * @param format 比賽格式
 */
export async function handleByeIfNeeded(
  tournamentId: string,
  match: Match,
  format: TournamentFormat
): Promise<void> {
  // 如果一位選手存在，另一位不存在，則自動晉級
  if (match.player1 && !match.player2) {
    console.log(`${match.player1.name} 輪空，自動晉級`);
    
    // 更新原比賽狀態為已完成
    const matchRef = doc(
      db,
      'tournaments',
      tournamentId,
      'matches',
      match.matchId
    );
    await updateDoc(matchRef, {
      status: 'completed',
      winner: match.player1.name,
    });
    
    await progressWinner(tournamentId, match.matchId, match.player1, format);
  } else if (match.player2 && !match.player1) {
    console.log(`${match.player2.name} 輪空，自動晉級`);
    
    // 更新原比賽狀態為已完成
    const matchRef = doc(
      db,
      'tournaments',
      tournamentId,
      'matches',
      match.matchId
    );
    await updateDoc(matchRef, {
      status: 'completed',
      winner: match.player2.name,
    });
    
    await progressWinner(tournamentId, match.matchId, match.player2, format);
  }
}

/**
 * 批量處理所有輪空
 * @param tournamentId 比賽ID
 * @param matches 所有比賽
 * @param format 比賽格式
 */
export async function processAllByes(
  tournamentId: string,
  matches: Record<string, Match>,
  format: TournamentFormat
): Promise<void> {
  for (const match of Object.values(matches)) {
    if (match.status === 'pending') {
      await handleByeIfNeeded(tournamentId, match, format);
    }
  }
}

