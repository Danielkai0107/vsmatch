import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Match, PlayerRef, TournamentFormat, Tournament } from "../types";
import { buildSourceMapping } from "./bracketLogic";

/**
 * 只填入下一輪位置，不進行輪空檢查（用於初始化階段）
 * @param tournamentId 比賽ID
 * @param completedMatchId 完成的比賽ID
 * @param winner 勝者
 * @param format 比賽格式
 */
async function fillNextMatchOnly(
  tournamentId: string,
  completedMatchId: string,
  winner: PlayerRef,
  format: TournamentFormat
): Promise<void> {
  try {
    // 獲取完成的比賽資料
    const completedMatchRef = doc(
      db,
      "tournaments",
      tournamentId,
      "matches",
      completedMatchId
    );
    const completedMatchSnap = await getDoc(completedMatchRef);

    if (!completedMatchSnap.exists()) {
      return;
    }

    const completedMatch = completedMatchSnap.data() as Match;
    const nextMatchId = completedMatch.nextMatchId;

    if (!nextMatchId) {
      // 沒有下一場比賽
      return;
    }

    // 建立來源映射
    const sourceMapping = buildSourceMapping(format);
    const nextMatchMapping = sourceMapping[nextMatchId];

    if (!nextMatchMapping) {
      return;
    }

    // 判斷勝者應該進入下一場比賽的 p1 還是 p2
    const isP1 = nextMatchMapping.p1_from === completedMatchId;
    const isP2 = nextMatchMapping.p2_from === completedMatchId;

    if (!isP1 && !isP2) {
      return;
    }

    // 更新下一場比賽，加入勝者
    const nextMatchRef = doc(
      db,
      "tournaments",
      tournamentId,
      "matches",
      nextMatchId
    );

    const updateData = isP1 ? { player1: winner } : { player2: winner };

    await updateDoc(nextMatchRef, updateData);

    console.log(
      `✅ ${winner.name} 填入 ${nextMatchId} 的 ${
        isP1 ? "P1" : "P2"
      } 位置（初始化階段）`
    );
  } catch (error) {
    console.error("填入下一輪失敗:", error);
  }
}

/**
 * 檢查比賽是否視為完成
 * @param match 比賽對象
 * @returns 是否視為完成
 */
function isMatchConsideredComplete(match: Match): boolean {
  // 1. 比賽已完成
  if (match.status === "completed") {
    return true;
  }

  // 2. 雙方都沒有選手（空的match，永遠不會有比賽）
  if (!match.player1 && !match.player2) {
    return true;
  }

  return false;
}

/**
 * 檢查並處理輪次完成
 * 當一輪所有比賽都完成後，處理下一輪的輪空
 * @param tournamentId 比賽ID
 * @param completedMatch 剛完成的比賽
 * @param format 比賽格式
 */
async function checkAndProcessRoundCompletion(
  tournamentId: string,
  completedMatch: Match,
  format: TournamentFormat
): Promise<void> {
  try {
    // 找出剛完成比賽所在的輪次
    let currentRound = -1;
    let currentStage = null;

    for (let i = 0; i < format.stages.length; i++) {
      const stage = format.stages[i];
      const matchFound = stage.matches.find(
        (m) => m.id === completedMatch.matchId
      );
      if (matchFound) {
        currentRound = i;
        currentStage = stage;
        break;
      }
    }

    if (currentRound === -1 || !currentStage) {
      return;
    }

    // 檢查該輪所有比賽是否都完成了
    const allMatchesInRound = currentStage.matches;
    let allComplete = true;

    for (const formatMatch of allMatchesInRound) {
      const matchRef = doc(
        db,
        "tournaments",
        tournamentId,
        "matches",
        formatMatch.id
      );
      const matchSnap = await getDoc(matchRef);

      if (matchSnap.exists()) {
        const match = matchSnap.data() as Match;
        if (!isMatchConsideredComplete(match)) {
          allComplete = false;
          break;
        }
      }
    }

    if (!allComplete) {
      console.log(`⏳ 第 ${currentRound + 1} 輪還有比賽未完成`);
      return;
    }

    console.log(`✅ 第 ${currentRound + 1} 輪所有比賽已完成！`);

    // 處理下一輪的輪空
    const nextRound = currentRound + 1;
    if (nextRound < format.stages.length) {
      const nextStage = format.stages[nextRound];
      console.log(`🔍 檢查第 ${nextRound + 1} 輪的輪空情況...`);

      for (const formatMatch of nextStage.matches) {
        const matchRef = doc(
          db,
          "tournaments",
          tournamentId,
          "matches",
          formatMatch.id
        );
        const matchSnap = await getDoc(matchRef);

        if (matchSnap.exists()) {
          const match = matchSnap.data() as Match;
          if (match.status === "pending") {
            await handleByeIfNeeded(tournamentId, match, format, false);
          }
        }
      }
    }
  } catch (error) {
    console.error("檢查輪次完成失敗:", error);
  }
}

/**
 * 處理勝者晉級到下一輪，並自動處理連續輪空
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
    // 報隊制 (KOTH) 特殊邏輯
    if (format.type === "koth") {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentSnap = await getDoc(tournamentRef);
      if (!tournamentSnap.exists()) return;
      const tournament = tournamentSnap.data() as Tournament;

      // 1. 更新勝場統計 (確保使用全新的物件參考)
      const kothStats = { ...(tournament.kothStats || {}) };
      const currentWins = kothStats[winner.name]?.wins || 0;
      kothStats[winner.name] = {
        wins: currentWins + 1,
      };

      console.log(`🏆 KOTH 勝場更新: ${winner.name} (${currentWins} -> ${currentWins + 1})`);

      // 2. 找出輸家
      const matchRef = doc(
        db,
        "tournaments",
        tournamentId,
        "matches",
        completedMatchId
      );
      const matchSnap = await getDoc(matchRef);
      if (!matchSnap.exists()) return;
      const matchData = matchSnap.data() as Match;
      const loser =
        matchData.player1?.name === winner.name
          ? matchData.player2
          : matchData.player1;

      // 3. 處理隊列：輸家到隊末，取隊首作為新對手
      let queue = [...(tournament.kothQueue || [])];
      if (loser) {
        queue.push(loser.name);
      }

      const nextOpponentName = queue.shift();
      const nextPlayer2: PlayerRef | null = nextOpponentName
        ? { name: nextOpponentName }
        : null;

      // 4. 重置比賽場次
      await updateDoc(matchRef, {
        player1: winner, // 勝者留下
        player2: nextPlayer2,
        sets: [],
        currentSet: 0,
        winner: null,
        status: nextPlayer2 ? "pending" : "live", // 如果沒人遞補，保持 live 等待
      });

      // 5. 更新賽事隊列與統計
      await updateDoc(tournamentRef, {
        kothQueue: queue,
        kothStats: kothStats,
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ KOTH: ${winner.name} 留下, ${loser?.name || "無"} 進入隊末`);
      return;
    }

    // 獲取完成的比賽資料
    const completedMatchRef = doc(
      db,
      "tournaments",
      tournamentId,
      "matches",
      completedMatchId
    );
    const completedMatchSnap = await getDoc(completedMatchRef);

    if (!completedMatchSnap.exists()) {
      throw new Error("比賽不存在");
    }

    const completedMatch = completedMatchSnap.data() as Match;

    // 確認比賽已完成
    if (completedMatch.status !== "completed") {
      throw new Error("比賽尚未完成");
    }

    // 獲取下一場比賽ID
    const nextMatchId = completedMatch.nextMatchId;

    if (!nextMatchId) {
      // 這是決賽，沒有下一場比賽，更新比賽狀態為已結束
      console.log("🏆 比賽結束！冠軍：", winner.name);
      console.log("決賽資料：", {
        player1: completedMatch.player1?.name,
        player2: completedMatch.player2?.name,
        winner: winner.name,
      });

      // 找出亞軍（決賽的失敗者）
      const runnerUp =
        completedMatch.player1?.name === winner.name
          ? completedMatch.player2?.name
          : completedMatch.player1?.name;

      console.log("🥈 亞軍：", runnerUp);

      try {
        const tournamentRef = doc(db, "tournaments", tournamentId);
        await updateDoc(tournamentRef, {
          status: "finished",
          finishedAt: new Date().toISOString(),
          champion: winner.name,
          runnerUp: runnerUp || null,
        });
        console.log("✅ 比賽狀態已更新為已結束", {
          champion: winner.name,
          runnerUp: runnerUp,
        });
      } catch (error) {
        console.error("更新比賽狀態失敗:", error);
      }

      return;
    }

    // 建立來源映射
    const sourceMapping = buildSourceMapping(format);
    const nextMatchMapping = sourceMapping[nextMatchId];

    if (!nextMatchMapping) {
      throw new Error("無法找到下一場比賽的來源映射");
    }

    // 判斷勝者應該進入下一場比賽的 p1 還是 p2
    const isP1 = nextMatchMapping.p1_from === completedMatchId;
    const isP2 = nextMatchMapping.p2_from === completedMatchId;

    if (!isP1 && !isP2) {
      throw new Error("無法確定勝者在下一場比賽的位置");
    }

    // 獲取下一場比賽當前狀態
    const nextMatchRef = doc(
      db,
      "tournaments",
      tournamentId,
      "matches",
      nextMatchId
    );
    const nextMatchSnap = await getDoc(nextMatchRef);

    if (!nextMatchSnap.exists()) {
      throw new Error("下一場比賽不存在");
    }

    const nextMatch = nextMatchSnap.data() as Match;

    // 更新下一場比賽，加入勝者
    const updateData = isP1 ? { player1: winner } : { player2: winner };

    await updateDoc(nextMatchRef, updateData);

    console.log(
      `✅ ${winner.name} 晉級到 ${nextMatchId} 的 ${isP1 ? "P1" : "P2"} 位置`
    );

    // 檢查下一場比賽雙方選手是否都已就位
    const updatedNextMatch = {
      ...nextMatch,
      ...updateData,
    } as Match;

    if (updatedNextMatch.player1 && updatedNextMatch.player2) {
      console.log(`⚔️ ${nextMatchId} 雙方選手就位，等待比賽開始`);
    } else {
      console.log(`⏳ ${nextMatchId} 等待另一組選手晉級...`);
    }

    // 檢查當前輪次是否所有比賽都完成了
    await checkAndProcessRoundCompletion(tournamentId, completedMatch, format);
  } catch (error) {
    console.error("晉級處理失敗:", error);
    throw error;
  }
}

/**
 * 檢查是否需要處理輪空（bye）
 * 如果對手不存在，自動晉級
 * @param tournamentId 比賽ID
 * @param match 比賽對象
 * @param format 比賽格式
 * @param isInitializing 是否在初始化階段（初始化時只處理第一輪）
 */
export async function handleByeIfNeeded(
  tournamentId: string,
  match: Match,
  format: TournamentFormat,
  isInitializing: boolean = false
): Promise<void> {
  // 如果一組選手存在，另一位不存在，則自動晉級
  if (match.player1 && !match.player2) {
    console.log(`${match.player1.name} 輪空，自動晉級`);

    // 更新原比賽狀態為已完成
    const matchRef = doc(
      db,
      "tournaments",
      tournamentId,
      "matches",
      match.matchId
    );
    await updateDoc(matchRef, {
      status: "completed",
      winner: match.player1.name,
    });

    // 如果是初始化階段，只填入下一輪位置，不遞歸處理輪空
    if (isInitializing) {
      await fillNextMatchOnly(
        tournamentId,
        match.matchId,
        match.player1,
        format
      );
    } else {
      // 正常比賽中，使用完整的晉級邏輯（包含遞歸處理輪空）
      await progressWinner(tournamentId, match.matchId, match.player1, format);
    }
  } else if (match.player2 && !match.player1) {
    console.log(`${match.player2.name} 輪空，自動晉級`);

    // 更新原比賽狀態為已完成
    const matchRef = doc(
      db,
      "tournaments",
      tournamentId,
      "matches",
      match.matchId
    );
    await updateDoc(matchRef, {
      status: "completed",
      winner: match.player2.name,
    });

    // 如果是初始化階段，只填入下一輪位置，不遞歸處理輪空
    if (isInitializing) {
      await fillNextMatchOnly(
        tournamentId,
        match.matchId,
        match.player2,
        format
      );
    } else {
      // 正常比賽中，使用完整的晉級邏輯（包含遞歸處理輪空）
      await progressWinner(tournamentId, match.matchId, match.player2, format);
    }
  }
}

/**
 * 批量處理所有輪空（只處理第一輪）
 * @param tournamentId 比賽ID
 * @param matches 所有比賽
 * @param format 比賽格式
 */
export async function processAllByes(
  tournamentId: string,
  matches: Record<string, Match>,
  format: TournamentFormat
): Promise<void> {
  // 只處理第一輪的輪空（有 p1_source 和 p2_source 的比賽）
  const firstRoundMatches = format.stages[0]?.matches || [];

  for (const formatMatch of firstRoundMatches) {
    const match = matches[formatMatch.id];
    if (match && match.status === "pending") {
      await handleByeIfNeeded(tournamentId, match, format, true);
    }
  }

  console.log("✅ 第一輪輪空處理完成");
}
