"use client";

import React, { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { useAuthInterceptor } from "@/hooks/useAuthInterceptor";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const setUser = useUserStore((state) => state.setUser);
    useAuthInterceptor();

    useEffect(() => {
        try {
            const unsubscribe = onAuthStateChanged(getClientAuth(), (user) => {
                if (user) {
                    setUser({
                        uid: user.uid,
                        email: user.email,
                        avatar: user.photoURL,
                        displayName: user.displayName,
                        // Credits and plan should be fetched from backend/firestore
                        // For now, setting default values
                        credits: 4,
                        plan: 'free'
                    });
                } else {
                    setUser({
                        uid: 'guest',
                        email: 'guest@pitchforge.local',
                        avatar: null,
                        displayName: 'Guest Creator',
                        credits: 10,
                        plan: 'free'
                    });
                }
            });

            return () => unsubscribe();
        } catch (error) {
            console.warn("Firebase auth unavailable, continuing in guest mode.", error);
            setUser({
                uid: 'guest',
                email: 'guest@pitchforge.local',
                avatar: null,
                displayName: 'Guest Creator',
                credits: 10,
                plan: 'free'
            });
        }
    }, [setUser]);

    return <>{children}</>;
};
