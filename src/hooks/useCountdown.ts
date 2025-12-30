import { useState, useEffect } from "react";
import { doc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Tournament } from "../types";

const COUNTDOWN_DURATION = 15 * 60 * 1000; // 10分鐘（毫秒）

interface CountdownResult {
  timeLeft: string; // 格式化的剩餘時間，例如 "9:45"
  isExpired: boolean; // 是否已過期
  remainingMs: number; // 剩餘毫秒數
}

/**
 * 計算並監控比賽的倒數計時
 * @param tournament 比賽對象
 * @param autoDelete 是否在倒數結束時自動刪除（僅舉辦者可用）
 * @returns 倒數計時資訊
 */
export function useCountdown(
  tournament: Tournament | null,
  autoDelete: boolean = false
): CountdownResult {
  const [remainingMs, setRemainingMs] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!tournament || tournament.status !== "draft") {
      setRemainingMs(0);
      setIsExpired(false);
      return;
    }

    // 計算剩餘時間
    const calculateRemaining = () => {
      const createdAt = tournament.createdAt;
      const createdTime =
        createdAt instanceof Date
          ? createdAt.getTime()
          : new Date(createdAt).getTime();
      const now = Date.now();
      const elapsed = now - createdTime;
      const remaining = COUNTDOWN_DURATION - elapsed;

      return remaining;
    };

    // 初始計算
    const initialRemaining = calculateRemaining();
    setRemainingMs(Math.max(0, initialRemaining));
    setIsExpired(initialRemaining <= 0);

    // 如果已過期且需要自動刪除
    if (initialRemaining <= 0 && autoDelete) {
      handleAutoDelete(tournament.id);
      return;
    }

    // 設置計時器
    const interval = setInterval(() => {
      const remaining = calculateRemaining();

      if (remaining <= 0) {
        setRemainingMs(0);
        setIsExpired(true);
        clearInterval(interval);

        // 自動刪除比賽
        if (autoDelete) {
          handleAutoDelete(tournament.id);
        }
      } else {
        setRemainingMs(remaining);
      }
    }, 1000); // 每秒更新一次

    return () => clearInterval(interval);
  }, [tournament, autoDelete]);

  // 格式化時間顯示
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return {
    timeLeft: formatTime(remainingMs),
    isExpired,
    remainingMs,
  };
}

/**
 * 自動刪除過期的比賽
 */
async function handleAutoDelete(tournamentId: string) {
  try {
    console.log(`開始刪除過期比賽: ${tournamentId}`);

    // 1. 刪除所有 matches 子集合
    const matchesRef = collection(db, "tournaments", tournamentId, "matches");
    const matchesSnapshot = await getDocs(matchesRef);
    const deleteMatchPromises = matchesSnapshot.docs.map((doc) =>
      deleteDoc(doc.ref)
    );
    await Promise.all(deleteMatchPromises);

    // 2. 刪除比賽本身
    await deleteDoc(doc(db, "tournaments", tournamentId));

    console.log(`比賽 ${tournamentId} 已自動刪除`);
  } catch (error) {
    console.error("自動刪除比賽失敗:", error);
  }
}
