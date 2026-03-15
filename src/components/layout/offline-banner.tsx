"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export const OfflineBanner: React.FC = () => {
    const [isOffline, setIsOffline] = useState(false);
    const [showBackOnline, setShowBackOnline] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            setShowBackOnline(true);
            setTimeout(() => setShowBackOnline(false), 5000);
        };
        const handleOffline = () => {
            setIsOffline(true);
            setShowBackOnline(false);
        };

        setIsOffline(!navigator.onLine);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    if (!isOffline && !showBackOnline) return null;

    return (
        <div className={cn(
            "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-5 duration-500",
            isOffline ? "bg-accent-pink text-white" : "bg-accent-green text-white"
        )}>
            {isOffline ? (
                <>
                    <WifiOff className="w-4 h-4" />
                    <span className="text-xs font-jakarta font-bold">You are currently offline. Progress won&apos;t save.</span>
                </>
            ) : (
                <>
                    <Wifi className="w-4 h-4" />
                    <span className="text-xs font-jakarta font-bold">Back online! Syncing your changes...</span>
                </>
            )}
        </div>
    );
};
