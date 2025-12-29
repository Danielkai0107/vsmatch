import type { SetScore, RuleConfig } from '../types';

/**
 * 計算累計總分
 * @param sets 所有局數比分
 * @returns 雙方總分 { p1: number, p2: number }
 */
export function getCumulativeScore(sets: SetScore[]): { p1: number; p2: number } {
  let p1Total = 0;
  let p2Total = 0;

  sets.forEach((set) => {
    p1Total += set.p1Score;
    p2Total += set.p2Score;
  });

  return { p1: p1Total, p2: p2Total };
}

/**
 * 判斷單局是否結束
 * @param p1Score 選手1分數
 * @param p2Score 選手2分數
 * @param rule 規則設定
 * @returns 是否結束
 */
export function isSetComplete(
  p1Score: number,
  p2Score: number,
  rule: RuleConfig
): boolean {
  const targetScore = rule.scoreToWin;

  // 雙方都未達到目標分數，本局未結束
  if (p1Score < targetScore && p2Score < targetScore) {
    return false;
  }

  // 至少有一方達到目標分數
  const maxScore = Math.max(p1Score, p2Score);
  if (maxScore < targetScore) {
    return false;
  }

  // 領先2分即可獲勝（大部分運動規則）
  const scoreDiff = Math.abs(p1Score - p2Score);
  return scoreDiff >= 2;
}

/**
 * 計算當前獲勝局數
 * @param sets 所有局數比分
 * @param currentSetIndex 當前局的索引（可選）
 * @returns 獲勝局數 { p1: number, p2: number }
 */
export function getSetsWon(sets: SetScore[], currentSetIndex?: number): { p1: number; p2: number } {
  let p1Wins = 0;
  let p2Wins = 0;

  sets.forEach((set, index) => {
    // 如果提供了 currentSetIndex，則跳過當前正在進行的局
    if (currentSetIndex !== undefined && index === currentSetIndex) {
      return;
    }
    
    // 只計算已完成的局（有明確勝負的局）
    if (set.p1Score > set.p2Score) {
      p1Wins++;
    } else if (set.p2Score > set.p1Score) {
      p2Wins++;
    }
  });

  return { p1: p1Wins, p2: p2Wins };
}

/**
 * 判斷整場比賽是否結束
 * @param sets 所有局數比分
 * @param rule 規則設定
 * @param currentSetIndex 當前局的索引（可選）
 * @returns 是否結束
 */
export function isMatchComplete(
  sets: SetScore[],
  rule: RuleConfig,
  currentSetIndex?: number
): boolean {
  // 累計總分制
  if (rule.scoringMode === 'cumulative') {
    // 計算已完成的局數（排除當前正在進行的局）
    const completedSets = currentSetIndex !== undefined ? sets.slice(0, currentSetIndex) : sets;
    const completedCount = completedSets.length;
    
    // 如果還沒打完固定局數，比賽未結束
    if (completedCount < rule.totalSets) {
      return false;
    }
    
    // 打完固定局數後，檢查總分
    const { p1, p2 } = getCumulativeScore(completedSets);
    
    // 如果總分不同，比賽結束
    if (p1 !== p2) {
      return true;
    }
    
    // 總分相同，需要延長賽（如果允許的話）
    // 這裡返回 false，因為需要繼續打延長賽
    return false;
  }
  
  // 單局制
  const { p1, p2 } = getSetsWon(sets, currentSetIndex);
  const setsToWin = rule.setsToWin;

  return p1 >= setsToWin || p2 >= setsToWin;
}

/**
 * 判斷比賽勝者
 * @param sets 所有局數比分
 * @param rule 規則設定
 * @returns 勝者 ('player1' | 'player2' | null)
 */
export function getMatchWinner(
  sets: SetScore[],
  rule: RuleConfig
): 'player1' | 'player2' | null {
  if (!isMatchComplete(sets, rule)) {
    return null;
  }

  // 累計總分制
  if (rule.scoringMode === 'cumulative') {
    const { p1, p2 } = getCumulativeScore(sets);
    if (p1 === p2) {
      return null; // 平分，需要延長賽
    }
    return p1 > p2 ? 'player1' : 'player2';
  }

  // 單局制
  const { p1, p2 } = getSetsWon(sets);
  return p1 > p2 ? 'player1' : 'player2';
}

/**
 * 格式化比分顯示
 * @param sets 所有局數比分
 * @returns 格式化的比分字串，例如: "21-19, 18-21, 21-16"
 */
export function formatScore(sets: SetScore[]): string {
  if (sets.length === 0) {
    return '-';
  }

  return sets.map((set) => `${set.p1Score}-${set.p2Score}`).join(', ');
}

/**
 * 格式化簡短比分（只顯示已結束局數）
 * @param sets 所有局數比分
 * @param currentSetIndex 當前局的索引（可選）
 * @returns 格式化的局數，例如: "2-1"
 */
export function formatSetScore(sets: SetScore[], currentSetIndex?: number): string {
  const { p1, p2 } = getSetsWon(sets, currentSetIndex);
  return `${p1}-${p2}`;
}

/**
 * 判斷當前是否為決勝局
 * @param sets 所有局數比分
 * @param rule 規則設定
 * @param currentSetIndex 當前局的索引（可選，用於排除正在進行的局）
 * @returns 是否為決勝局
 */
export function isTiebreaker(sets: SetScore[], rule: RuleConfig, currentSetIndex?: number): boolean {
  if (!rule.tiebreaker) {
    return false;
  }

  const { p1, p2 } = getSetsWon(sets, currentSetIndex);
  const setsToWin = rule.setsToWin;

  // 雙方各贏 setsToWin-1 局時，進入決勝局
  return p1 === setsToWin - 1 && p2 === setsToWin - 1;
}

/**
 * 獲取當前局的目標分數
 * @param sets 所有局數比分
 * @param rule 規則設定
 * @param currentSetIndex 當前局的索引（用於正確判斷決勝局）
 * @returns 目標分數
 */
export function getCurrentSetTarget(
  sets: SetScore[],
  rule: RuleConfig,
  currentSetIndex?: number
): number {
  if (isTiebreaker(sets, rule, currentSetIndex) && rule.tiebreaker) {
    return rule.tiebreaker.scoreToWin;
  }
  return rule.scoreToWin;
}

/**
 * 判斷是否在延長賽中（累計制專用）
 * @param rule 規則設定
 * @param currentSetIndex 當前局的索引
 * @returns 是否在延長賽
 */
export function isInOvertime(
  rule: RuleConfig,
  currentSetIndex: number
): boolean {
  if (rule.scoringMode !== 'cumulative' || !rule.allowOvertime) {
    return false;
  }
  
  // 如果當前局數超過固定局數，就是延長賽
  return currentSetIndex >= rule.totalSets;
}

/**
 * 獲取當前局的顯示名稱
 * @param rule 規則設定
 * @param currentSetIndex 當前局的索引
 * @param sportId 運動項目ID（可選）
 * @returns 局名稱（如"第1局"或"第一節"）
 */
export function getCurrentSetName(
  rule: RuleConfig,
  currentSetIndex: number,
  sportId?: string
): string {
  const isBasketball = sportId === 'basketball';
  const unit = isBasketball ? '節' : '局';

  if (isInOvertime(rule, currentSetIndex)) {
    const overtimeNumber = currentSetIndex - rule.totalSets + 1;
    return `延長賽第${overtimeNumber}${unit}`;
  }
  return `第${currentSetIndex + 1}${unit}`;
}

/**
 * 創建新的一局
 * @returns 新局比分
 */
export function createNewSet(): SetScore {
  return {
    p1Score: 0,
    p2Score: 0,
  };
}

/**
 * 驗證比分是否有效
 * @param sets 所有局數比分
 * @param rule 規則設定
 * @returns 是否有效
 */
export function validateScores(
  sets: SetScore[],
  rule: RuleConfig
): boolean {
  // 檢查每局比分是否合理
  for (const set of sets) {
    if (set.p1Score < 0 || set.p2Score < 0) {
      return false;
    }

    // 檢查是否有一方達到目標分數
    const target = rule.scoreToWin;
    if (set.p1Score < target && set.p2Score < target) {
      // 如果都沒達到目標，這局還在進行中（可能是當前局）
      continue;
    }

    // 如果有達到目標，檢查分差
    if (!isSetComplete(set.p1Score, set.p2Score, rule)) {
      return false;
    }
  }

  return true;
}

