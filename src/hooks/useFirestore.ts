import { useEffect } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTournamentStore } from '../stores/tournamentStore';
import { useMatchStore } from '../stores/matchStore';
import type { Tournament, Match } from '../types';

// 監聽所有比賽
export function useTournaments() {
  const { setTournaments, setLoading, setError } = useTournamentStore();

  useEffect(() => {
    setLoading(true);

    const q = query(
      collection(db, 'tournaments'),
      orderBy('createdAt', 'desc')
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

