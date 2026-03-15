"use client";

import React, { useState } from "react";
import { MoreVertical, ExternalLink, Calendar, Trash2, Copy, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ProjectCardProps {
    id: string;
    title: string;
    date: string;
    status: 'Completed' | 'Generating' | 'Draft';
    thumbnail?: string;
    onRenamed?: (id: string, title: string) => void;
    onDeleted?: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ id, title, date, status, thumbnail, onRenamed, onDeleted }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [draftTitle, setDraftTitle] = useState(title);

    const statusStyles = {
        Completed: "text-accent-green bg-accent-green/10 border-accent-green/20",
        Generating: "text-accent-pink bg-accent-pink/10 border-accent-pink/20 animate-pulse",
        Draft: "text-slate-300 bg-slate-800 border-slate-700",
    };

    const handleRename = async () => {
        const trimmed = draftTitle.trim();
        if (!trimmed || trimmed === title) {
            setIsRenaming(false);
            setIsMenuOpen(false);
            setDraftTitle(title);
            return;
        }

        try {
            const response = await fetch(`/api/pitch/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: trimmed }),
            });

            if (!response.ok) {
                throw new Error("Rename failed");
            }

            onRenamed?.(id, trimmed);
            setIsRenaming(false);
            setIsMenuOpen(false);
        } catch (error) {
            console.error("Failed to rename pitch", error);
        }
    };

    const handleDelete = async () => {
        try {
            const response = await fetch(`/api/pitch/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Delete failed");
            }

            onDeleted?.(id);
        } catch (error) {
            console.error("Failed to delete pitch", error);
        } finally {
            setIsDeleting(false);
            setIsMenuOpen(false);
        }
    };

    return (
        <div className="group relative bg-slate-900/90 border border-slate-800 rounded-2xl transition-all duration-300 hover:shadow-card-hover hover:border-accent-pink/30">
            {/* Thumbnail */}
            <div className="aspect-video bg-slate-950 overflow-hidden relative rounded-t-2xl">
                {thumbnail ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={thumbnail} alt={title} className="w-full h-full object-contain bg-slate-950 transition-transform duration-500 group-hover:scale-[1.02]" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Copy className="w-8 h-8 text-slate-700 group-hover:text-accent-pink/30 transition-colors" />
                    </div>
                )}

                {/* Open Button Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                    <Link
                        href={`/pitch/${id}`}
                        className="flex items-center gap-2 bg-slate-950 text-white px-5 py-2.5 font-jakarta font-bold text-sm rounded-xl shadow-lg hover:scale-105 transition-transform border border-white/10"
                    >
                        Open <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3 rounded-b-2xl">
                <div className="flex items-start justify-between gap-2">
                    {isRenaming ? (
                        <div className="flex-1 space-y-2">
                            <input
                                value={draftTitle}
                                onChange={(e) => setDraftTitle(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        void handleRename();
                                    }
                                    if (e.key === "Escape") {
                                        setDraftTitle(title);
                                        setIsRenaming(false);
                                        setIsMenuOpen(false);
                                    }
                                }}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-jakarta font-bold text-white focus:outline-none focus:border-accent-pink"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => void handleRename()}
                                    className="px-3 py-1.5 text-xs font-bold bg-accent-pink text-white rounded-lg"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => {
                                        setDraftTitle(title);
                                        setIsRenaming(false);
                                        setIsMenuOpen(false);
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold border border-slate-700 text-slate-300 rounded-lg"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <h3 className="font-jakarta font-bold text-white truncate text-lg group-hover:text-accent-pink transition-colors">
                            {title}
                        </h3>
                    )}
                    <div className="relative">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-white"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && !isDeleting && !isRenaming && (
                            <div className="absolute right-0 top-8 w-40 bg-slate-950 border border-slate-800 shadow-card rounded-xl z-30 py-1 overflow-hidden">
                                <button
                                    onClick={() => setIsRenaming(true)}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" /> Rename
                                </button>
                                <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-900 transition-colors">
                                    <Copy className="w-3.5 h-3.5" /> Duplicate
                                </button>
                                <button
                                    onClick={() => setIsDeleting(true)}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-accent-pink hover:bg-accent-pink/5 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {isDeleting ? (
                    <div className="flex flex-col gap-2 p-3 bg-accent-pink/5 border border-accent-pink/20 rounded-xl">
                        <p className="text-xs font-inter text-accent-pink text-center font-semibold">Are you sure?</p>
                        <div className="flex gap-2">
                            <button
                                className="flex-1 py-2 text-xs font-bold bg-accent-pink text-white rounded-lg"
                                onClick={() => void handleDelete()}
                            >
                                Confirm
                            </button>
                            <button
                                className="flex-1 py-2 text-xs font-bold border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-900"
                                onClick={() => { setIsDeleting(false); setIsMenuOpen(false); }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-400 font-inter text-xs">
                            <Calendar className="w-3 h-3" />
                            {date}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setIsDeleting(true);
                                    setIsMenuOpen(false);
                                }}
                                className="p-2 rounded-lg text-slate-400 hover:text-accent-pink hover:bg-accent-pink/10 transition-colors"
                                title="Delete project"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <div className={cn("px-2.5 py-1 border rounded-full text-[10px] font-bold tracking-wider uppercase", statusStyles[status])}>
                                {status}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
