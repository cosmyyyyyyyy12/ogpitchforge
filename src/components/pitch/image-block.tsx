"use client";

import React, { useState } from "react";
import { Download, RefreshCw, Pencil, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Block } from "@/types/pitch";

interface ImageBlockProps {
    block: Block;
    isActive: boolean;
    onRegenerate: (newPrompt?: string) => void;
    onSelect: () => void;
    isReadOnly?: boolean;
}

export const ImageBlock = React.memo<ImageBlockProps>(({
    block,
    isActive,
    onRegenerate,
    onSelect,
    isReadOnly = false
}) => {
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [newPrompt, setNewPrompt] = useState(block.prompt || "");
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleRegen = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRegenerate(newPrompt);
        setIsEditingPrompt(false);
    };

    const handleSimpleRegen = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRegenerate();
    };

    return (
        <div
            onClick={onSelect}
            className={cn(
                "group relative py-8 px-10 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl transition-all duration-300",
                isActive ? "border-[rgba(249,115,22,0.35)] shadow-card bg-[rgba(249,115,22,0.04)]" : "hover:border-[rgba(249,115,22,0.35)] hover:shadow-sm"
            )}
        >
            {/* Block Header */}
            <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-dm font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[rgba(249,115,22,0.45)]" />
                    Visual Asset
                    {block.status === 'generating' && (
                        <span className="flex items-center gap-1.5 text-accent-pink ml-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-pink opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-pink"></span>
                            </span>
                            Rendering...
                        </span>
                    )}
                </span>

                {/* Toolbar */}
                {!isEditingPrompt && !isReadOnly && block.status === 'complete' && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(249,115,22,0.08)] rounded-xl transition-all" title="Download">
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsEditingPrompt(true); }}
                            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(249,115,22,0.08)] rounded-xl transition-all"
                            title="Edit Prompt"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleSimpleRegen}
                            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(249,115,22,0.08)] rounded-xl transition-all"
                            title="Regenerate"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="relative aspect-video w-full bg-[var(--bg-elevated)] overflow-hidden rounded-2xl border border-[var(--border)]">
                {/* State: Pending / Generating / Skeleton */}
                {(block.status === 'pending' || block.status === 'generating') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="w-full h-full bg-gradient-to-r from-transparent via-[rgba(249,115,22,0.18)] to-transparent animate-shimmer absolute inset-0" />
                        <div className="text-[10px] font-dm font-bold text-[var(--text-muted)] uppercase tracking-widest">
                            {block.status === 'generating' ? "Processing Image..." : "Awaiting Trigger"}
                        </div>
                    </div>
                )}

                {/* State: Complete / Regenerating */}
                {(block.status === 'complete' || block.status === 'regenerating') && block.mediaUrl && (
                    <div className="relative w-full h-full group/image">
                        <img
                            src={block.mediaUrl}
                            alt={block.altText || "Generated Art"}
                            onLoad={() => setImageLoaded(true)}
                            className={cn(
                                "w-full h-full object-cover transition-all duration-700 ease-out",
                                !imageLoaded ? "opacity-0 scale-105 blur-lg" : "opacity-100 scale-100 blur-0",
                                block.status === 'regenerating' ? "opacity-40 grayscale blur-sm" : ""
                            )}
                        />
                        {block.status === 'regenerating' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(15,15,15,0.55)] backdrop-blur-[2px]">
                                <RefreshCw className="w-8 h-8 text-accent-pink animate-spin mb-3" />
                                <span className="text-[10px] font-dm font-bold text-[var(--text-primary)] uppercase tracking-widest">Updating Asset...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* State: Failed */}
                {block.status === 'failed' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(239,68,68,0.12)]">
                        <AlertCircle className="w-8 h-8 text-accent-pink mb-3" />
                        <span className="text-sm font-jakarta font-bold text-[var(--text-primary)] uppercase mb-4">Generation Failed</span>
                        <button
                            onClick={handleSimpleRegen}
                            className="px-6 py-2 text-xs font-jakarta font-bold btn-primary rounded-xl shadow-pink transition-transform active:scale-95"
                        >
                            Retry Asset
                        </button>
                    </div>
                )}
            </div>

            {/* Prompt Display */}
            {block.prompt && !isEditingPrompt && (
                <div className="mt-6">
                    <p className="text-[11px] font-inter text-[var(--text-muted)] italic bg-[rgba(26,26,26,0.72)] p-4 rounded-xl border border-[var(--border)] leading-relaxed">
                        <span className="font-bold text-[var(--text-secondary)] mr-2 not-italic tracking-wider uppercase text-[9px]">Prompt:</span>
                        {block.prompt}
                    </p>
                </div>
            )}

            {/* Edit Prompt Panel */}
            {isEditingPrompt && (
                <div className="mt-6 p-6 border border-accent-pink/20 bg-accent-pink/[0.02] rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-300" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-dm font-bold text-accent-pink uppercase tracking-widest">Edit Generation Prompt</span>
                        <button onClick={() => setIsEditingPrompt(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <textarea
                        value={newPrompt}
                        onChange={(e) => setNewPrompt(e.target.value)}
                        className="w-full min-h-[100px] bg-[var(--bg-elevated)] border border-[var(--border)] p-4 text-[var(--text-primary)] font-inter text-sm focus:outline-none focus:border-[#F97316] rounded-xl shadow-sm resize-none leading-relaxed"
                        placeholder="Describe your vision..."
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
                            Regenerate with New Prompt
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

ImageBlock.displayName = "ImageBlock";
