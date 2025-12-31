import { useEffect } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTournamentStore } from '../stores/tournamentStore';
import { useMatchStore } from '../stores/matchStore';
import type { Tournament, Match } from '../types';

// 監聽活躍的比賽（進行中 + 最近結束的）- 用於首頁
export function useActiveTournaments() {
  const { setTournaments, setLoading, setError } = useTournamentStore();

  useEffect(() => {
    setLoading(true);

    // 查詢進行中和已結束的比賽（限制數量以提升效能）
    const q = query(
      collection(db, 'tournaments'),
      where('status', 'in', ['live', 'finished']),
      orderBy('createdAt', 'desc'),
      limit(50) // 限制最多 50 場比賽
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tournaments: Tournament[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(data.createdAt),
            updatedAt:
              data.updatedAt instanceof Timestamp
                ? data.updatedAt.toDate()
                : new Date(data.updatedAt),
          } as Tournament;
        });
        setTournaments(tournaments);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Error fetching tournaments:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [setTournaments, setLoading, setError]);
}

// 監聽用戶的籌備中比賽 - 用於首頁顯示「最近發布」
export function useMyDraftTournaments(userId: string | undefined) {
  const setTournaments = useTournamentStore(state => state.setTournaments);
  const setError = useTournamentStore(state => state.setError);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'tournaments'),
      where('organizerId', '==', userId),
      where('status', '==', 'draft'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const draftTournaments: Tournament[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(data.createdAt),
            updatedAt:
              data.updatedAt instanceof Timestamp
                ? data.updatedAt.toDate()
                : new Date(data.updatedAt),
          } as Tournament;
        });
        
        // 使用 Zustand 的 updater function 安全地合併資料
        setTournaments((currentTournaments) => {
          const existingIds = new Set(currentTournaments.map(t => t.id));
          const newTournaments = draftTournaments.filter(t => !existingIds.has(t.id));
          return [...currentTournaments, ...newTournaments];
        });
        setError(null);
      },
      (error) => {
        console.error('Error fetching draft tournaments:', error);
        setError(error.message);
      }
    );

    return () => unsubscribe();
  }, [userId, setTournaments, setError]);
}

// 監聽用戶舉辦的所有比賽 - 用於個人頁面
export function useMyOrganizedTournaments(userId: string | undefined) {
  const setTournaments = useTournamentStore((state) => state.setTournaments);
  const setLoading = useTournamentStore((state) => state.setLoading);
  const setError = useTournamentStore((state) => state.setError);

  useEffect(() => {
    if (!userId) {
      setTournaments([]);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "tournaments"),
      where("organizerId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const organizedTournaments: Tournament[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(data.createdAt),
            updatedAt:
              data.updatedAt instanceof Timestamp
                ? data.updatedAt.toDate()
                : new Date(data.updatedAt),
          } as Tournament;
        });

        // 使用更新函數合併，避免覆蓋掉其他來源（如參加的比賽）
        setTournaments((current) => {
          const otherTournaments = current.filter(
            (t) => t.organizerId !== userId
          );
          return [...organizedTournaments, ...otherTournaments].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          );
        });

        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error("Error fetching organized tournaments:", error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, setTournaments, setLoading, setError]);
}

// 監聽用戶參加的所有比賽 - 用於個人頁面
export function useMyJoinedTournaments(userId: string | undefined) {
  const setTournaments = useTournamentStore((state) => state.setTournaments);
  const setLoading = useTournamentStore((state) => state.setLoading);
  const setError = useTournamentStore((state) => state.setError);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    // 由於 Firestore 的限制，我們無法直接查詢 players.userId
    // 這裡我們先查詢所有活躍和已結束的比賽，然後在前端過濾
    // 較好的長期做法是在 tournament document 加上 playerIds: string[] 欄位
    const q = query(
      collection(db, "tournaments"),
      where("status", "in", ["draft", "live", "finished"]),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allRecentTournaments: Tournament[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(data.createdAt),
            updatedAt:
              data.updatedAt instanceof Timestamp
                ? data.updatedAt.toDate()
                : new Date(data.updatedAt),
          } as Tournament;
        });

        // 篩選出用戶參加的比賽
        const joinedTournaments = allRecentTournaments.filter((t) =>
          t.players.some((p) => p.userId === userId || p.id === userId)
        );

        // 使用更新函數合併
        setTournaments((current) => {
          const existingIds = new Set(current.map((t) => t.id));
          const newUniqueTournaments = joinedTournaments.filter(
            (t) => !existingIds.has(t.id)
          );
          return [...current, ...newUniqueTournaments].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          );
        });

        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error("Error fetching joined tournaments:", error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, setTournaments, setLoading, setError]);
}

// 向後兼容：保留原有的 useTournaments，但改為使用優化後的查詢
export function useTournaments() {
  return useActiveTournaments();
}

// 監聽單一比賽
export function useTournamentById(tournamentId: string | undefined) {
  const { setCurrentTournament, setLoading, setError } = useTournamentStore();

  useEffect(() => {
    if (!tournamentId) {
      setCurrentTournament(null);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      doc(db, 'tournaments', tournamentId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const tournament: Tournament = {
            ...data,
            id: snapshot.id,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(data.createdAt),
            updatedAt:
              data.updatedAt instanceof Timestamp
                ? data.updatedAt.toDate()
                : new Date(data.updatedAt),
          } as Tournament;
          setCurrentTournament(tournament);
          setError(null);
        } else {
          setCurrentTournament(null);
          setError('Tournament not found');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching tournament:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tournamentId, setCurrentTournament, setLoading, setError]);
}

// 監聽比賽的所有場次
export function useMatches(tournamentId: string | undefined) {
  const { setMatches, setLoading, setError } = useMatchStore();

  useEffect(() => {
    if (!tournamentId) {
      setMatches({});
      return;
    }

    setLoading(true);

    const matchesRef = collection(db, 'tournaments', tournamentId, 'matches');

    const unsubscribe = onSnapshot(
      matchesRef,
      (snapshot) => {
        const matches: Record<string, Match> = {};
        snapshot.forEach((doc) => {
          matches[doc.id] = {
            ...doc.data(),
            matchId: doc.id,
          } as Match;
        });
        setMatches(matches);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Error fetching matches:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tournamentId, setMatches, setLoading, setError]);
}

