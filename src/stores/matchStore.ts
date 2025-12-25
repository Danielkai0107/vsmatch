import { create } from 'zustand';
import type { Match } from '../types';

interface MatchState {
  matches: Record<string, Match>; // matchId -> Match
  loading: boolean;
  error: string | null;

  setMatches: (matches: Record<string, Match>) => void;
  updateMatch: (matchId: string, match: Match) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMatches: () => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  matches: {},
  loading: false,
  error: null,

  setMatches: (matches) => set({ matches }),
  
  updateMatch: (matchId, match) =>
    set((state) => ({
      matches: {
        ...state.matches,
        [matchId]: match,
      },
    })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearMatches: () => set({ matches: {} }),
}));

