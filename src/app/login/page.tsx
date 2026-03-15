"use client";

import React, { useState } from "react";
import { getClientAuth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";

const LoginPage = () => {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const setUser = useUserStore((state) => state.setUser);

    const handleAuth = async () => {
        setIsLoading(true);
        setError(null);
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(getClientAuth(), provider);
            setUser({
                uid: result.user.uid,
                email: result.user.email,
                avatar: result.user.photoURL,
                displayName: result.user.displayName,
                credits: 4,
                plan: 'free',
            });
            router.push("/create/dashboard");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8f8fa] relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-pink/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-green/5 rounded-full blur-[100px]" />

            <div className="relative z-10 w-full max-w-md px-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-10 shadow-card space-y-8">
                    {/* Logo Section */}
                    <div className="text-center space-y-3">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <div className="w-10 h-10 bg-accent-pink rounded-xl flex items-center justify-center">
                                <Zap className="w-5 h-5 text-white fill-white" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-jakarta font-extrabold text-black tracking-tight">
                            PitchForge
                        </h1>
                        <p className="text-gray-500 font-inter text-sm">
                            Pitch your game. Get funded.
                        </p>
                    </div>

                    {/* Buttons Section */}
                    <div className="space-y-3">
                        <button
                            onClick={handleAuth}
                            disabled={isLoading}
                            className="w-full h-12 bg-black text-white font-inter font-semibold rounded-xl flex items-center justify-center gap-3 transition-all hover:bg-gray-900 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                        <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Sign in with Google
                                </>
                            )}
                        </button>

                    </div>

                    {error && (
                        <p className="text-accent-pink text-xs text-center font-inter">
                            {error}
                        </p>
                    )}

                    {/* Footer */}
                    <div className="pt-4 border-t border-gray-100 text-center">
                        <div className="text-xs font-inter text-gray-400 space-x-3">
                            <span className="cursor-pointer hover:text-black transition-colors">Terms</span>
                            <span>·</span>
                            <span className="cursor-pointer hover:text-black transition-colors">Privacy</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
