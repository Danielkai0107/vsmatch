import type { SportsData, FormatsData } from '../types';

// 運動資料 - 簡化版，移除預設規則
export const SPORTS: SportsData = {
  badminton: {
    id: 'badminton',
    name: '羽球',
    icon: '🏸',
    modes: ['單打', '雙打'],
  },
  basketball: {
    id: 'basketball',
    name: '籃球',
    icon: '🏀',
    modes: ['3x3', '5x5'],
  },
  volleyball: {
    id: 'volleyball',
    name: '排球',
    icon: '🏐',
    modes: ['室內', '沙灘'],
  },
  tennis: {
    id: 'tennis',
    name: '網球',
    icon: '🎾',
    modes: ['單打', '雙打'],
  },
  tableTennis: {
    id: 'tableTennis',
    name: '桌球',
    icon: '🏓',
    modes: ['單打', '雙打'],
  },
  other: {
    id: 'other',
    name: '其他運動',
    icon: '⚽',
    modes: ['通用'],
  },
};

// 賽制格式資料
export const FORMATS: FormatsData = {
  ko_4: {
    id: 'ko_4',
    name: '4強單淘汰',
    type: 'knockout',
    totalSlots: 4,
    stages: [
      {
        round: 1,
        name: '準決賽',
        matches: [
          {
            id: 'r1m1',
            next: 'r2m1',
            p1_source: 0,
            p2_source: 1,
          },
          {
            id: 'r1m2',
            next: 'r2m1',
            p1_source: 2,
            p2_source: 3,
          },
        ],
      },
      {
        round: 2,
        name: '決賽',
        matches: [
          {
            id: 'r2m1',
            next: null,
          },
        ],
      },
    ],
  },
  ko_8: {
    id: 'ko_8',
    name: '8強單淘汰',
    type: 'knockout',
    totalSlots: 8,
    stages: [
      {
        round: 1,
        name: '第一輪',
        matches: [
          {
            id: 'r1m1',
            next: 'r2m1',
            p1_source: 0,
            p2_source: 1,
          },
          {
            id: 'r1m2',
            next: 'r2m1',
            p1_source: 2,
            p2_source: 3,
          },
          {
            id: 'r1m3',
            next: 'r2m2',
            p1_source: 4,
            p2_source: 5,
          },
          {
            id: 'r1m4',
            next: 'r2m2',
            p1_source: 6,
            p2_source: 7,
          },
        ],
      },
      {
        round: 2,
        name: '準決賽',
        matches: [
          {
            id: 'r2m1',
            next: 'r3m1',
          },
          {
            id: 'r2m2',
            next: 'r3m1',
          },
        ],
      },
      {
        round: 3,
        name: '決賽',
        matches: [
          {
            id: 'r3m1',
            next: null,
          },
        ],
      },
    ],
  },
  ko_16: {
    id: 'ko_16',
    name: '16強單淘汰',
    type: 'knockout',
    totalSlots: 16,
    stages: [
      {
        round: 1,
        name: '16強',
        matches: [
          { id: 'r1m1', next: 'r2m1', p1_source: 0, p2_source: 1 },
          { id: 'r1m2', next: 'r2m1', p1_source: 2, p2_source: 3 },
          { id: 'r1m3', next: 'r2m2', p1_source: 4, p2_source: 5 },
          { id: 'r1m4', next: 'r2m2', p1_source: 6, p2_source: 7 },
          { id: 'r1m5', next: 'r2m3', p1_source: 8, p2_source: 9 },
          { id: 'r1m6', next: 'r2m3', p1_source: 10, p2_source: 11 },
          { id: 'r1m7', next: 'r2m4', p1_source: 12, p2_source: 13 },
          { id: 'r1m8', next: 'r2m4', p1_source: 14, p2_source: 15 },
        ],
      },
      {
        round: 2,
        name: '8強',
        matches: [
          { id: 'r2m1', next: 'r3m1' },
          { id: 'r2m2', next: 'r3m1' },
          { id: 'r2m3', next: 'r3m2' },
          { id: 'r2m4', next: 'r3m2' },
        ],
      },
      {
        round: 3,
        name: '準決賽',
        matches: [
          { id: 'r3m1', next: 'r4m1' },
          { id: 'r3m2', next: 'r4m1' },
        ],
      },
      {
        round: 4,
        name: '決賽',
        matches: [{ id: 'r4m1', next: null }],
        },
    ],
  },
};

// 輔助函數：通過 ID 獲取運動資料
export function getSportById(id: string) {
  return SPORTS[id] || null;
}

// 輔助函數：通過 ID 獲取格式資料
export function getFormatById(id: string) {
  return FORMATS[id] || null;
}

// 輔助函數：獲取所有運動列表
export function getAllSports() {
  return Object.values(SPORTS);
}

// 輔助函數：獲取所有格式列表
export function getAllFormats() {
  return Object.values(FORMATS);
}

