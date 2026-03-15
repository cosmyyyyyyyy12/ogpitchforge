"use client";

import React from "react";
import { motion } from "framer-motion";
import { LoaderProgressiveBar } from "@/components/ui/loader-progressive-bar";

interface TransitionOverlayProps {
    isVisible: boolean;
    gameTitle: string;
}

export const TransitionOverlay: React.FC<TransitionOverlayProps> = ({ isVisible, gameTitle }) => {
    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center"
        >
            <div className="space-y-6">
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-5xl md:text-7xl font-jakarta font-extrabold text-black tracking-tight"
                >
                    {gameTitle || "Your Pitch"}
                </motion.h1>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col items-center justify-center gap-6"
                >
                    <div className="flex items-center gap-2 text-gray-500 font-inter text-sm">
                        Initializing pitch
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-pink opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-pink" />
                        </span>
                    </div>

                    <div className="w-64">
                        <LoaderProgressiveBar label="Generating" />
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};
