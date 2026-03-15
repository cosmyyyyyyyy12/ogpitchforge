"use client";

import React, { useEffect, useState } from "react";
import { BlockGallery } from "@/components/pitch/block-gallery";
import { Download, MessageSquare, Zap } from "lucide-react";
import Link from "next/link";
import { Block } from "@/types/pitch";
export default function SharePitchPage({ params }: { params: { id: string } }) {
    const [blocks, setBlocks] = useState<Block[]>([]);

    useEffect(() => {
        const loadPitch = async () => {
            try {
                const response = await fetch(`/api/pitch/${params.id}`);
                const data = await response.json();
                setBlocks(data.pitch?.blocks ?? []);
            } catch (error) {
                console.error("Failed to load shared pitch", error);
            }
        };

        void loadPitch();
    }, [params.id]);

    return (
        <div className="min-h-screen bg-white selection:bg-accent-pink/30">
            {/* Read-only Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-8">
                <Link href="/create/dashboard" className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-accent-pink rounded-lg flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white fill-white" />
                    </div>
                    <span className="text-lg font-jakarta font-extrabold text-black tracking-tight">
                        Pitch<span className="text-accent-pink">Forge</span>
                    </span>
                </Link>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-jakarta font-bold text-black hover:bg-gray-50 transition-all">
                    <MessageSquare className="w-3.5 h-3.5" /> Contact Creator
                </button>
            </header>

            <main className="max-w-[900px] mx-auto py-12 px-6">
                <BlockGallery blocks={blocks} isReadOnly={true} />

                <div className="mt-16 flex flex-col items-center space-y-8">
                    <button className="flex items-center gap-2 px-8 py-4 bg-accent-pink text-white font-jakarta font-bold text-sm rounded-xl shadow-pink hover:scale-[1.02] active:scale-[0.98] transition-all">
                        <Download className="w-4 h-4" /> Download PDF Deck
                    </button>

                    <footer className="text-xs font-inter text-gray-400 pt-8 border-t border-gray-100 w-full text-center">
                        Made with <span className="text-black font-bold">PitchForge</span>
                    </footer>
                </div>
            </main>
        </div>
    );
}
