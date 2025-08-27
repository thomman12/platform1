import { create } from 'zustand';

type Community = {
  id: string;
  name: string;
  description: string;
};

type FollowedStore = {
  followed: Community[];
  setFollowed: (communities: Community[]) => void;
  addFollowed: (community: Community) => void;
};

export const useFollowedStore = create<FollowedStore>((set) => ({
  followed: [],

  setFollowed: (communities) => set({ followed: communities }),

  addFollowed: (community) =>
  set((state) =>
    state.followed.some((c) => c.id === community.id)
      ? state
      : { followed: [...state.followed, community] }
  ),
}))
