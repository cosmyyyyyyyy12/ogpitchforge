"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Block } from "@/types/pitch";

interface AudioBlockProps {
    block: Block;
    isActive: boolean;
    onRegenerate: () => void;
    onSelect: () => void;
    isReadOnly?: boolean;
}

export const AudioBlock = React.memo<AudioBlockProps>(({
    block,
    isActive,
    onRegenerate,
    onSelect,
    isReadOnly = false
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Randomized but seeded waveform heights
    const seed = block.blockId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const waveHeights = Array.from({ length: 24 }, (_, i) => {
        const h = Math.abs(Math.sin(seed + i)) * 0.7 + 0.3;
        return h;
    });

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => setDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current || block.status !== 'complete') return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div
            onClick={onSelect}
            className={cn(
                "group relative py-8 px-10 bg-white border border-gray-100 rounded-2xl transition-all duration-300",
                isActive ? "border-accent-pink shadow-card bg-accent-pink/[0.02]" : "hover:border-accent-pink/50 hover:shadow-sm"
            )}
        >
            <audio ref={audioRef} src={block.mediaUrl || ""} className="hidden" />

            {/* Block Header */}
            <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-dm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                    Audio Transcript
                    {block.status === 'generating' && (
                        <span className="flex items-center gap-1.5 text-accent-pink ml-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-pink opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-pink"></span>
                            </span>
                            Composing...
                        </span>
                    )}
                </span>

                {/* Toolbar */}
                {!isReadOnly && block.status === 'complete' && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all" title="Download">
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
                            className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all"
                            title="Regenerate"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className={cn(
                "inline-flex items-center gap-6 px-8 py-4 rounded-3xl border transition-all max-w-full overflow-hidden",
                block.status === 'complete' ? "border-accent-green/30 bg-accent-green/[0.02] shadow-sm" : "border-gray-100 bg-gray-50/50",
                block.status === 'generating' && "border-accent-green animate-pulse",
                block.status === 'failed' && "border-accent-pink/20 bg-accent-pink/[0.02]"
            )}>
                {/* Play/Pause Button */}
                <button
                    onClick={togglePlay}
                    disabled={block.status !== 'complete'}
                    className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm",
                        block.status === 'complete' ? "bg-accent-green text-black hover:scale-105" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                >
                    {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-1" />}
                </button>

                {/* Waveform Visualization */}
                <div className="flex items-center h-10 gap-[4px] min-w-[200px]">
                    {waveHeights.map((h, i) => {
                        const isPast = (i / waveHeights.length) <= (currentTime / (duration || 1));
                        return (
                            <div
                                key={i}
                                className={cn(
                                    "w-[4px] transition-all rounded-full",
                                    isPast ? "bg-accent-green" : "bg-gray-200",
                                    isPlaying ? "animate-waveform" : ""
                                )}
                                style={{
                                    height: `${h * 100}%`,
                                    animationDelay: `${i * 0.05}s`,
                                    animationDuration: `${0.8 + (h * 0.4)}s`
                                }}
                            />
                        );
                    })}
                </div>

                {/* Info / State */}
                <div className="flex flex-col pr-2">
                    <span className={cn(
                        "text-[10px] font-dm font-bold uppercase tracking-wider",
                        block.status === 'failed' ? "text-accent-pink" : "text-black"
                    )}>
                        {block.status === 'generating' && "Syncing Voice..."}
                        {block.status === 'complete' && `${formatTime(currentTime)} / ${formatTime(duration || 15)}`}
                        {block.status === 'failed' && "Audio Failed"}
                        {block.status === 'pending' && "Awaiting Audio"}
                    </span>
                    {block.status === 'failed' && !isReadOnly && (
                        <button onClick={(e) => { e.stopPropagation(); onRegenerate(); }} className="text-[9px] font-jakarta font-bold text-accent-pink underline text-left mt-0.5">
                            Retry Generation
                        </button>
                    )}
                </div>
            </div>

            {block.transcript && (
                <div className="mt-6">
                    <p className="text-sm font-inter text-gray-500 leading-relaxed italic border-l-2 border-gray-100 pl-6">
                        &quot;{block.transcript}&quot;
                    </p>
                </div>
            )}

            <style jsx>{`
                @keyframes waveform {
                    0% { transform: scaleY(1); }
                    50% { transform: scaleY(1.3); }
                    100% { transform: scaleY(1); }
                }
                .animate-waveform {
                    animation-name: waveform;
                    animation-iteration-count: infinite;
                    animation-timing-function: ease-in-out;
                }
            `}</style>
        </div>
    );
});

AudioBlock.displayName = "AudioBlock";

