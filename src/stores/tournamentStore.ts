import { create } from 'zustand';
import type { Tournament } from '../types';

interface TournamentState {
  tournaments: Tournament[];
  currentTournament: Tournament | null;
  loading: boolean;
  error: string | null;

  setTournaments: (tournaments: Tournament[] | ((prev: Tournament[]) => Tournament[])) => void;
  setCurrentTournament: (tournament: Tournament | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTournamentStore = create<TournamentState>((set) => ({
  tournaments: [],
  currentTournament: null,
  loading: false,
  error: null,

  setTournaments: (tournaments) => set((state) => ({ 
    tournaments: typeof tournaments === 'function' ? tournaments(state.tournaments) : tournaments 
  })),
  setCurrentTournament: (tournament) => set({ currentTournament: tournament }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

