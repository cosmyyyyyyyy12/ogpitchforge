"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Edit2, Copy, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Block } from "@/types/pitch";
import {
    interleavedBlocksToPlainText,
    parseStoredInterleavedContent,
} from "@/lib/interleaved-content";
import { InterleavedRenderer } from "@/components/pitch/interleaved-renderer";

interface TextBlockProps {
    block: Block;
    isActive: boolean;
    onUpdate: (content: string) => void;
    onRegenerate: () => void;
    onSelect: () => void;
    isReadOnly?: boolean;
}

function normalizePitchMarkdown(content: string) {
    return content
        .replace(/^\s*---+\s*$/gm, "")
        .replace(/^\*\*(\d+\.?\s+.+?)\*\*$/gm, "## $1")
        .replace(/^\*\*(.+?)\*\*$/gm, "### $1")
        .replace(/^#{1,6}\s*\*+\s*(.+?)\*+\s*$/gm, "### $1")
        .replace(/^#{1,6}\s*(\d+\.?\s+.+)$/gm, "## $1")
        .replace(/^#{1,6}\s*(.+)$/gm, "### $1")
        .replace(/^(\s*[-*]\s+)\*\*(.+?)\*\*:\s*/gm, "$1$2: ")
        .replace(/^(\s*[-*]\s+)\*\*(.+?)\*\*/gm, "$1$2")
        .replace(/^\*\*(.+?)\*\*:\s*/gm, "$1: ")
        .replace(/\*\*([^*\n]{1,80})\*\*/g, "$1")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export const TextBlock = React.memo<TextBlockProps>(({
    block,
    isActive,
    onUpdate,
    onRegenerate,
    onSelect,
    isReadOnly = false
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(normalizePitchMarkdown(block.content || ""));
    const [displayedContent, setDisplayedContent] = useState(normalizePitchMarkdown(block.content || ""));
    const [copied, setCopied] = useState(false);
    const interleavedBlocks = parseStoredInterleavedContent(block.content);
    const shouldRenderInterleaved =
        !!interleavedBlocks || ((block.status === 'generating' || block.status === 'regenerating') && !block.content);

    // Typewriter effect for streaming
    useEffect(() => {
        if (interleavedBlocks) {
            setDisplayedContent(block.content || "");
            return;
        }

        if (block.status === 'generating' && block.content) {
            const fullText = normalizePitchMarkdown(block.content);

            if (fullText.length > displayedContent.length) {
                const timeout = setTimeout(() => {
                    setDisplayedContent(fullText.slice(0, displayedContent.length + 2));
                }, 18);
                return () => clearTimeout(timeout);
            }
        } else if (block.status === 'complete') {
            setDisplayedContent(normalizePitchMarkdown(block.content || ""));
        } else {
            setDisplayedContent(normalizePitchMarkdown(block.content || ""));
        }
    }, [block.status, block.content, displayedContent, interleavedBlocks]);

    const handleSave = () => {
        onUpdate(normalizePitchMarkdown(editContent));
        setIsEditing(false);
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(
            interleavedBlocks ? interleavedBlocksToPlainText(interleavedBlocks) : normalizePitchMarkdown(block.content || "")
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRegen = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRegenerate();
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
        setEditContent(normalizePitchMarkdown(block.content || ""));
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
                    {block.type === 'text' ? 'Narrative' : block.type}
                    {block.status === 'generating' && (
                        <span className="flex items-center gap-1.5 text-accent-pink ml-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-pink opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-pink"></span>
                            </span>
                            Generating
                        </span>
                    )}
                </span>

                {/* Toolbar */}
                {!isEditing && !isReadOnly && block.status === 'complete' && (
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button
                            onClick={handleEdit}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-jakarta font-bold text-[var(--text-primary)] bg-[var(--bg-elevated)] hover:bg-[rgba(249,115,22,0.08)] border border-[var(--border)] rounded-xl transition-all"
                            title="Edit"
                        >
                            <Edit2 className="w-4 h-4" />
                            Edit
                        </button>
                        <button
                            onClick={handleCopy}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-jakarta font-bold text-[var(--text-primary)] bg-[var(--bg-elevated)] hover:bg-[rgba(249,115,22,0.08)] border border-[var(--border)] rounded-xl transition-all"
                            title="Copy"
                        >
                            {copied ? <Check className="w-4 h-4 text-[#F97316]" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Copied" : "Copy"}
                        </button>
                        <button
                            onClick={handleRegen}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-jakarta font-bold text-[var(--text-primary)] bg-[var(--bg-elevated)] hover:bg-[rgba(249,115,22,0.08)] border border-[var(--border)] rounded-xl transition-all"
                            title="Regenerate"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Regenerate
                        </button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full min-h-[200px] bg-[var(--bg-elevated)] border border-[var(--border)] p-6 text-[var(--text-primary)] font-inter text-base focus:outline-none focus:border-[#F97316] rounded-2xl resize-none leading-relaxed"
                        autoFocus
                    />
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-5 py-2 text-xs font-jakarta font-bold border border-[var(--border)] text-[var(--text-primary)] hover:bg-[rgba(249,115,22,0.08)] rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 text-xs font-jakarta font-bold btn-primary rounded-xl shadow-pink transition-transform active:scale-95"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            ) : (
                shouldRenderInterleaved ? (
                    <InterleavedRenderer
                        blocks={interleavedBlocks ?? []}
                        isGenerating={block.status === 'generating' || block.status === 'regenerating'}
                    />
                ) : (
                    <div className="prose prose-invert max-w-none text-[var(--text-primary)]">
                        <ReactMarkdown
                            components={{
                                h1: ({ children }) => <h1 className="text-3xl font-jakarta font-extrabold text-[var(--text-primary)] mb-6 tracking-tight">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-2xl font-jakarta font-bold text-[var(--text-primary)] mb-4 tracking-tight">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-xl font-jakarta font-bold text-[var(--text-primary)] mb-3 tracking-tight">{children}</h3>,
                                h4: ({ children }) => <h4 className="text-lg font-jakarta font-bold text-[var(--text-primary)] mb-3 tracking-tight">{children}</h4>,
                                p: ({ children }) => (
                                    <p className="text-[var(--text-primary)] font-inter text-lg leading-relaxed mb-4">
                                        {children}
                                        {block.status === 'generating' && (
                                            <span className="inline-block w-1.5 h-5 bg-accent-pink ml-1 animate-pulse" />
                                        )}
                                    </p>
                                ),
                                ul: ({ children }) => <ul className="space-y-3 mb-6">{children}</ul>,
                                ol: ({ children }) => <ol className="space-y-3 mb-6">{children}</ol>,
                                li: ({ children }) => (
                                    <li className="ml-5 text-[var(--text-primary)] font-inter text-lg leading-relaxed pl-1 marker:text-[#F97316]">
                                        <span>{children}</span>
                                    </li>
                                ),
                                a: ({ children, href }) => (
                                    <a href={href} className="text-[#F97316] underline underline-offset-4">
                                        <span>{children}</span>
                                    </a>
                                ),
                                hr: () => <div className="my-6 h-px bg-[var(--border)]" />,
                                strong: ({ children }) => <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>,
                            }}
                        >
                            {displayedContent}
                        </ReactMarkdown>
                    </div>
                )
            )}
        </div>
    );
});

TextBlock.displayName = "TextBlock";
