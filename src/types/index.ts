// 運動類型
export interface Sport {
  id: string;
  name: string;
  icon: string;
  modes: string[];
  defaultRules?: RuleConfig; // 新增：運動項目的預設規則
}

// 比賽計分模式
export type ScoringMode = "sets" | "cumulative";
// 'sets' - 單局制：每局獨立計分，看贏幾局（羽球、排球）
// 'cumulative' - 累計總分制：所有局分數加總（籃球、棒球）

// 規則設定 - 簡化且更靈活
export interface RuleConfig {
  scoreToWin: number; // 單局目標分數（累計制時為建議分數）
  setsToWin: number; // 獲勝所需局數（累計制時無效）
  totalSets: number; // 總共要打幾局
  scoringMode: ScoringMode; // 計分模式
  allowOvertime: boolean; // 是否允許延長賽（累計制專用）
  tiebreaker: {
    // 決勝局規則（可選，單局制專用）
    scoreToWin: number;
  } | null;
}

// 向後兼容的舊規則預設格式（如果需要）
export interface RulePreset {
  id: string;
  label: string;
  config: RuleConfig;
}

// 比賽格式
export interface TournamentFormat {
  id: string;
  name: string;
  type: "knockout" | "round-robin";
  totalSlots: number;
  stages: Stage[];
}

export interface Stage {
  round: number;
  name: string;
  matches: FormatMatch[];
}

export interface FormatMatch {
  id: string;
  next: string | null;
  p1_source?: number;
  p2_source?: number;
}

// 玩家
export interface Player {
  name: string;
  index: number;
  id?: string; // 向後兼容
  userId?: string; // 登入使用者的 userId（如果有登入）
}

// 比賽
export interface Tournament {
  id: string;
  pin: string; // 比賽 PIN（公開）
  scorerPin: string; // 計分 PIN（私密）
  name: string;
  region?: string; // 地區：北部、中部、南部
  organization?: string; // 單位：社團、學校、公司、個人、業餘
  organizerId: string;
  status: "draft" | "locked" | "live" | "finished";
  config: TournamentConfig;
  players: Player[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentConfig {
  sportId: string;
  formatId: string;
  rules: RuleConfig; // 直接存儲規則配置，更靈活
  // 向後兼容舊版本（可選）
  ruleId?: string; // 舊版本使用預設規則ID
}

// 單局比分
export interface SetScore {
  p1Score: number;
  p2Score: number;
}

// 比賽場次
export interface Match {
  matchId: string;
  tournamentId: string;
  player1: PlayerRef | null;
  player2: PlayerRef | null;
  sets: SetScore[];
  currentSet: number;
  winner: string | null;
  status: "pending" | "live" | "completed";
  nextMatchId: string | null;
}

export interface PlayerRef {
  name: string;
  source?: number | string; // 可能是索引或來自其他場次
}

// 用戶
export interface User {
  uid: string;
  email: string;
  displayName: string;
  createdTournaments: string[];
}

// 體育資料集合
export interface SportsData {
  [sportId: string]: Sport;
}

export interface FormatsData {
  [formatId: string]: TournamentFormat;
}

// 局數制度選項
export interface SetsOption {
  id: string;
  label: string;
  setsToWin: number; // 需要贏幾局（單局制）
  totalSets: number; // 最多/固定打幾局
  scoringMode: ScoringMode; // 計分模式
  hasTiebreaker: boolean; // 是否有決勝局（單局制）
  allowOvertime: boolean; // 是否允許延長賽（累計制）
}

// 常用的局數制度
export const SETS_OPTIONS: SetsOption[] = [
  // 單局制度
  {
    id: "single",
    label: "單局制",
    setsToWin: 1,
    totalSets: 1,
    scoringMode: "sets",
    hasTiebreaker: false,
    allowOvertime: false,
  },
  {
    id: "bo3",
    label: "3 局 2 勝",
    setsToWin: 2,
    totalSets: 3,
    scoringMode: "sets",
    hasTiebreaker: false,
    allowOvertime: false,
  },
  {
    id: "bo5",
    label: "5 局 3 勝",
    setsToWin: 3,
    totalSets: 5,
    scoringMode: "sets",
    hasTiebreaker: false,
    allowOvertime: false,
  },
  {
    id: "bo7",
    label: "7 局 4 勝",
    setsToWin: 4,
    totalSets: 7,
    scoringMode: "sets",
    hasTiebreaker: false,
    allowOvertime: false,
  },

  // 累計總分制度（籃球、棒球）
  {
    id: "fixed4",
    label: "4 局（總分制）",
    setsToWin: 0,
    totalSets: 4,
    scoringMode: "cumulative",
    hasTiebreaker: false,
    allowOvertime: true,
  },
];

// 輔助函數：根據規則獲取賽制描述
export function getSetsFormatLabel(rule: RuleConfig): string {
  if (rule.scoringMode === "cumulative") {
    return `固定${rule.totalSets}局（總分制）`;
  }

  const option = SETS_OPTIONS.find(
    (opt) => opt.setsToWin === rule.setsToWin && opt.scoringMode === "sets"
  );
  if (option) {
    return option.label;
  }
  // 如果找不到匹配，返回通用格式
  return rule.setsToWin === 1
    ? "單局制"
    : `${rule.setsToWin * 2 - 1}局${rule.setsToWin}勝`;
}
