import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PermissionState {
  // 儲存 tournamentId -> scorerPin 的映射
  authorizedTournaments: Record<string, string>;
  
  // 檢查是否有計分權限
  hasScorePermission: (tournamentId: string) => boolean;
  
  // 授予計分權限
  grantScorePermission: (tournamentId: string, scorerPin: string) => void;
  
  // 撤銷計分權限
  revokeScorePermission: (tournamentId: string) => void;
  
  // 清除所有權限
  clearAllPermissions: () => void;
}

export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      authorizedTournaments: {},

      hasScorePermission: (tournamentId: string) => {
        const { authorizedTournaments } = get();
        return tournamentId in authorizedTournaments;
      },

      grantScorePermission: (tournamentId: string, scorerPin: string) => {
        set((state) => ({
          authorizedTournaments: {
            ...state.authorizedTournaments,
            [tournamentId]: scorerPin,
          },
        }));
      },

      revokeScorePermission: (tournamentId: string) => {
        set((state) => {
          const newAuth = { ...state.authorizedTournaments };
          delete newAuth[tournamentId];
          return { authorizedTournaments: newAuth };
        });
      },

      clearAllPermissions: () => {
        set({ authorizedTournaments: {} });
      },
    }),
    {
      name: 'permission-storage', // localStorage key
    }
  )
);

