import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PermissionState {
  // 儲存 tournamentId -> scorerPin 的映射
  authorizedTournaments: Record<string, string>;
  // 儲存 tournamentId -> boolean (是否有報名權限)
  joinPermissions: Record<string, boolean>;

  // 檢查是否有計分權限
  hasScorePermission: (tournamentId: string) => boolean;
  // 檢查是否有報名權限
  hasJoinPermission: (tournamentId: string) => boolean;

  // 授予計分權限
  grantScorePermission: (tournamentId: string, scorerPin: string) => void;
  // 授予報名權限
  grantJoinPermission: (tournamentId: string) => void;

  // 撤銷計分權限
  revokeScorePermission: (tournamentId: string) => void;
  // 撤銷報名權限
  revokeJoinPermission: (tournamentId: string) => void;

  // 清除所有權限
  clearAllPermissions: () => void;
}

export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      authorizedTournaments: {},
      joinPermissions: {},

      hasScorePermission: (tournamentId: string) => {
        const { authorizedTournaments } = get();
        return tournamentId in authorizedTournaments;
      },

      hasJoinPermission: (tournamentId: string) => {
        const { joinPermissions } = get();
        return !!joinPermissions[tournamentId];
      },

      grantScorePermission: (tournamentId: string, scorerPin: string) => {
        set((state) => ({
          authorizedTournaments: {
            ...state.authorizedTournaments,
            [tournamentId]: scorerPin,
          },
        }));
      },

      grantJoinPermission: (tournamentId: string) => {
        set((state) => ({
          joinPermissions: {
            ...state.joinPermissions,
            [tournamentId]: true,
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

      revokeJoinPermission: (tournamentId: string) => {
        set((state) => {
          const newJoin = { ...state.joinPermissions };
          delete newJoin[tournamentId];
          return { joinPermissions: newJoin };
        });
      },

      clearAllPermissions: () => {
        set({ authorizedTournaments: {}, joinPermissions: {} });
      },
    }),
    {
      name: "permission-storage", // localStorage key
    }
  )
);
