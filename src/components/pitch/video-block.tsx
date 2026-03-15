"use client";

import React, { useMemo, useState } from "react";
import { Clapperboard, Link2, Pencil, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Block } from "@/types/pitch";

interface VideoBlockProps {
    block: Block;
    isActive: boolean;
    onRegenerate: (newPrompt?: string) => void;
    onSelect: () => void;
    isReadOnly?: boolean;
}

function isPlayableVideo(url: string | null) {
    if (!url) {
        return false;
    }

    return url.startsWith("data:video/") || url.startsWith("blob:") || url.startsWith("http://") || url.startsWith("https://");
}

export const VideoBlock = React.memo<VideoBlockProps>(({
    block,
    isActive,
    onRegenerate,
    onSelect,
    isReadOnly = false,
}) => {
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [newPrompt, setNewPrompt] = useState(block.prompt || "");
    const playable = useMemo(() => isPlayableVideo(block.mediaUrl), [block.mediaUrl]);

    const handleRegen = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRegenerate(newPrompt);
        setIsEditingPrompt(false);
    };

    return (
        <div
            onClick={onSelect}
            className={cn(
                "group relative py-8 px-10 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl transition-all duration-300",
                isActive ? "border-[rgba(249,115,22,0.35)] shadow-card bg-[rgba(249,115,22,0.04)]" : "hover:border-[rgba(249,115,22,0.35)] hover:shadow-sm"
            )}
        >
            <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-dm font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[rgba(249,115,22,0.45)]" />
                    Trailer Video
                    {block.status === "generating" && (
                        <span className="flex items-center gap-1.5 text-accent-pink ml-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-pink opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-pink" />
                            </span>
                            Generating...
                        </span>
                    )}
                </span>

                {!isEditingPrompt && !isReadOnly && block.status === "complete" && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsEditingPrompt(true); }}
                            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(249,115,22,0.08)] rounded-xl transition-all"
                            title="Edit Prompt"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
                            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(249,115,22,0.08)] rounded-xl transition-all"
                            title="Regenerate"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]">
                {playable ? (
                    <video
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover bg-black"
                        src={block.mediaUrl ?? undefined}
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center bg-[linear-gradient(135deg,rgba(239,68,68,0.12),rgba(249,115,22,0.08))]">
                        <Clapperboard className="w-10 h-10 text-[#F97316] mb-4" />
                        <p className="text-lg font-jakarta font-bold text-[var(--text-primary)]">
                            Trailer clip is being prepared
                        </p>
                        <p className="mt-2 text-sm font-inter text-[var(--text-muted)] max-w-xl">
                            {block.error || "PitchForge generated the trailer job, but the playable video asset is not ready yet."}
                        </p>
                        {block.mediaUrl && (
                            <a
                                href={block.mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-jakarta font-bold text-[var(--text-primary)] hover:border-[rgba(249,115,22,0.35)]"
                            >
                                <Link2 className="w-4 h-4" />
                                Open Source Asset
                            </a>
                        )}
                    </div>
                )}
            </div>

            {block.transcript && (
                <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[rgba(26,26,26,0.72)] px-5 py-4">
                    <p className="text-[10px] font-dm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Trailer Script</p>
                    <p className="mt-2 text-sm font-inter leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
                        {block.transcript}
                    </p>
                </div>
            )}

            {block.prompt && !isEditingPrompt && (
                <div className="mt-6">
                    <p className="text-[11px] font-inter text-[var(--text-muted)] italic bg-[rgba(26,26,26,0.72)] p-4 rounded-xl border border-[var(--border)] leading-relaxed">
                        <span className="font-bold text-[var(--text-secondary)] mr-2 not-italic tracking-wider uppercase text-[9px]">Prompt:</span>
                        {block.prompt}
                    </p>
                </div>
            )}

            {isEditingPrompt && (
                <div className="mt-6 p-6 border border-accent-pink/20 bg-accent-pink/[0.02] rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-300" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-dm font-bold text-accent-pink uppercase tracking-widest">Edit Video Prompt</span>
                        <button onClick={() => setIsEditingPrompt(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <textarea
                        value={newPrompt}
                        onChange={(e) => setNewPrompt(e.target.value)}
                        className="w-full min-h-[100px] bg-[var(--bg-elevated)] border border-[var(--border)] p-4 text-[var(--text-primary)] font-inter text-sm focus:outline-none focus:border-[#F97316] rounded-xl shadow-sm resize-none leading-relaxed"
                        placeholder="Describe the trailer you want Veo to generate..."
                    />
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsEditingPrompt(false)}
                            className="px-4 py-2 text-xs font-jakarta font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRegen}
                            className="px-6 py-2 text-xs font-jakarta font-bold btn-primary rounded-xl shadow-pink transition-transform active:scale-95"
                        >
                            Regenerate Video
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

VideoBlock.displayName = "VideoBlock";
