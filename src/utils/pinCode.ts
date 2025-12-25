import { customAlphabet } from 'nanoid';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Tournament } from '../types';

// 生成6位數字 PIN 碼
const generateNumericPin = customAlphabet('0123456789', 6);

/**
 * 生成6位數隨機 PIN 碼（基礎函數）
 * @returns 6位數 PIN 碼
 */
function generatePinBase(): string {
  return generateNumericPin();
}

/**
 * 檢查 PIN 是否在資料庫中已存在
 * @param pin PIN 碼
 * @param field 檢查的欄位名稱（'pin' 或 'scorerPin'）
 * @returns 是否已存在
 */
async function isPinExists(pin: string, field: 'pin' | 'scorerPin'): Promise<boolean> {
  try {
    const tournamentsRef = collection(db, 'tournaments');
    const q = query(tournamentsRef, where(field, '==', pin));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking PIN existence:', error);
    return false;
  }
}

/**
 * 生成不重複的 PIN 碼（檢查資料庫）
 * @param field 檢查的欄位名稱
 * @param maxAttempts 最大嘗試次數
 * @returns 唯一的 PIN 碼
 */
async function generateUniquePin(
  field: 'pin' | 'scorerPin',
  maxAttempts: number = 10
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const pin = generatePinBase();
    const exists = await isPinExists(pin, field);
    
    if (!exists) {
      return pin;
    }
    
    console.log(`PIN ${pin} 已存在，重新生成...`);
  }
  
  // 如果嘗試多次都失敗，還是返回一個（機率極低）
  console.warn(`生成唯一 PIN 失敗，返回隨機 PIN`);
  return generatePinBase();
}

/**
 * 生成6位數隨機 PIN 碼（對外接口，檢查資料庫）
 * @returns 唯一的 6 位數 PIN 碼
 */
export async function generatePin(): Promise<string> {
  return generateUniquePin('scorerPin');
}

/**
 * 生成兩個不重複的 PIN 碼（檢查資料庫）
 * @returns 比賽 PIN 和計分 PIN
 */
export async function generatePinPair(): Promise<{ pin: string; scorerPin: string }> {
  // 並行生成兩個唯一的 PIN
  const [pin, scorerPin] = await Promise.all([
    generateUniquePin('pin'),
    generateUniquePin('scorerPin'),
  ]);

  // 確保兩個 PIN 不同（額外保險）
  if (pin === scorerPin) {
    const newScorerPin = await generateUniquePin('scorerPin');
    return { pin, scorerPin: newScorerPin };
  }

  return { pin, scorerPin };
}

/**
 * 通過比賽 PIN 找到比賽（公開功能）
 * @param pin 比賽 PIN 碼
 * @returns 比賽對象，如果不存在則返回 null
 */
export async function findTournamentByPin(
  pin: string
): Promise<Tournament | null> {
  try {
    const tournamentsRef = collection(db, 'tournaments');
    const q = query(tournamentsRef, where('pin', '==', pin));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Tournament;
  } catch (error) {
    console.error('Error finding tournament by PIN:', error);
    return null;
  }
}

/**
 * 通過計分 PIN 找到比賽（私密功能）
 * @param scorerPin 計分 PIN 碼
 * @returns 比賽對象，如果不存在則返回 null
 */
export async function findTournamentByScorerPin(
  scorerPin: string
): Promise<Tournament | null> {
  try {
    const tournamentsRef = collection(db, 'tournaments');
    const q = query(tournamentsRef, where('scorerPin', '==', scorerPin));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Tournament;
  } catch (error) {
    console.error('Error finding tournament by scorer PIN:', error);
    return null;
  }
}

/**
 * 驗證計分 PIN（私密功能）
 * @param tournamentId 比賽ID
 * @param inputScorerPin 輸入的計分 PIN
 * @returns 是否驗證成功
 */
export async function validateScorerPin(
  tournamentId: string,
  inputScorerPin: string
): Promise<boolean> {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) {
      return false;
    }

    const tournament = tournamentSnap.data() as Tournament;
    return tournament.scorerPin === inputScorerPin;
  } catch (error) {
    console.error('Error validating scorer PIN:', error);
    return false;
  }
}

/**
 * 格式化 PIN 碼顯示（用於隱藏）
 * @param pin PIN 碼
 * @param visible 是否可見
 * @returns 格式化後的 PIN 碼
 */
export function formatPin(pin: string, visible: boolean = true): string {
  if (!visible) {
    return '••••••';
  }
  return pin;
}

