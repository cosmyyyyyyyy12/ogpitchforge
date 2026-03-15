import { create } from 'zustand';
import { UserState } from '@/types/pitch';

interface UserStore extends UserState {
    setUser: (user: Partial<UserState>) => void;
    deductCredit: () => void;
    refundCredit: () => void;
    topUpCredits: (amount: number) => void;
    logout: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
    uid: 'guest',
    email: 'guest@pitchforge.local',
    avatar: null,
    displayName: 'Guest Creator',
    credits: 10,
    plan: 'free',

    setUser: (user) => set((state) => ({ ...state, ...user })),

    deductCredit: () => set((state) => ({
        credits: Math.max(0, state.credits - 1)
    })),

    refundCredit: () => set((state) => ({
        credits: state.credits + 1
    })),

    topUpCredits: (amount) => set((state) => ({
        credits: state.credits + amount
    })),

    logout: () => set({
        uid: 'guest',
        email: 'guest@pitchforge.local',
        avatar: null,
        displayName: 'Guest Creator',
        credits: 10,
        plan: 'free'
    }),
}));
