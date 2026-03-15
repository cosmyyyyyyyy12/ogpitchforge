"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Block } from "@/types/pitch";

interface TableBlockProps {
    block: Block;
    isActive: boolean;
    onRegenerate: () => void;
    onSelect: () => void;
    isReadOnly?: boolean;
}

export const TableBlock = React.memo<TableBlockProps>(({
    block,
    isActive,
    onRegenerate,
    onSelect,
    isReadOnly = false
}) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(block.content || "");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRegen = (e: React.MouseEvent) => {
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
            <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-dm font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[rgba(249,115,22,0.45)]" />
                    {block.type === 'storyboard' ? 'Storyboard Flow' : 'Analytical Data'}
                </span>

                {!isReadOnly && block.status === 'complete' && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                            onClick={handleCopy}
                            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(249,115,22,0.08)] rounded-xl transition-all"
                            title="Copy Markdown"
                        >
                            {copied ? <Check className="w-4 h-4 text-[#F97316]" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={handleRegen}
                            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(249,115,22,0.08)] rounded-xl transition-all"
                            title="Regenerate"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--border)] scrollbar-hide">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        table: ({ children }) => <table className="w-full text-left border-collapse">{children}</table>,
                        thead: ({ children }) => <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">{children}</thead>,
                        th: ({ children }) => <th className="px-6 py-4 text-[11px] font-jakarta font-bold text-[var(--text-primary)] uppercase tracking-wider border-r border-[var(--border)] last:border-0">{children}</th>,
                        td: ({ children }) => <td className="px-6 py-4 text-sm font-inter text-[var(--text-secondary)] border-r border-[var(--border)] last:border-0">{children}</td>,
                        tr: ({ children }) => <tr className="border-b border-[var(--border)] last:border-0 odd:bg-[var(--bg-surface)] even:bg-[var(--bg-elevated)] transition-colors hover:bg-[rgba(249,115,22,0.06)]">{children}</tr>,
                    }}
                >
                    {block.content || ""}
                </ReactMarkdown>
            </div>

            {block.status === 'generating' && (
                <div className="mt-6 flex items-center gap-2 text-[10px] font-dm font-bold text-accent-pink uppercase tracking-widest">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-pink opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-pink"></span>
                    </span>
                    Compiling Data Structures...
                </div>
            )}
        </div>
    );
});

TableBlock.displayName = "TableBlock";
