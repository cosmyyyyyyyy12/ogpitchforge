"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/app-layout";
import { usePitchStore } from "@/store/pitchStore";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { ArrowLeft, Play, LayoutGrid, Check, AlertCircle, X, Clapperboard, Swords, UserRound, WandSparkles, Globe2, BarChart3, Music4, Sparkles, Image as ImageIcon } from "lucide-react";
import { TextBlock } from "@/components/pitch/text-block";
import { ImageBlock } from "@/components/pitch/image-block";
import { VideoBlock } from "@/components/pitch/video-block";
import { AudioBlock } from "@/components/pitch/audio-block";
import { TableBlock } from "@/components/pitch/table-block";
import { DraggableBlock } from "@/components/pitch/draggable-block";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Block } from "@/types/pitch";
import { ExportModal } from "@/components/pitch/export-modal";
import { useStream } from "@/hooks/useStream";
import { useAutosave } from "@/hooks/useAutosave";
import { useRegenerate } from "@/hooks/useRegenerate";
import { SlideDeck } from "@/components/slides/SlideDeck";

export default function PitchEditorPage({ params }: { params: { id: string } }) {
    const {
        pitchTitle,
        blocks,
        streamStatus,
        saveStatus,
        activeBlockId,
        appendBlock,
        reorderBlocks,
        updateBlock,
        updateTitle
    } = usePitchStore();

    const [isSlideMode, setIsSlideMode] = useState(false);
    const [creativeLoading, setCreativeLoading] = useState<string | null>(null);
    const [creativeInstruction, setCreativeInstruction] = useState("");
    const [activeStudioTab, setActiveStudioTab] = useState<"pitch" | "concept" | "trailer" | "character" | "gameplay" | "world" | "market" | "audio">("pitch");

    // Initialize streaming and autosave
    useStream(params.id);
    useAutosave();
    const { regenerateBlock } = useRegenerate();

    useEffect(() => {
        if (!isSlideMode) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsSlideMode(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSlideMode]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const visibleBlocks = useMemo(() => {
        const normalized = blocks.map((block, index) => ({
            ...block,
            prompt: block.prompt || (index === 0 ? "creative:pitch" : block.prompt),
        }));

        if (activeStudioTab === "pitch") {
            return normalized.filter((block, index) => (block.prompt || "").startsWith("creative:pitch") || index === 0);
        }

        if (activeStudioTab === "trailer") {
            return normalized.filter((block) => (block.prompt || "").startsWith("creative:trailer"));
        }

        return normalized.filter((block) => block.prompt === `creative:${activeStudioTab}`);
    }, [activeStudioTab, blocks]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = blocks.findIndex((b) => b.blockId === active.id);
            const newIndex = blocks.findIndex((b) => b.blockId === over.id);
            reorderBlocks(arrayMove(blocks, oldIndex, newIndex));
        }
    };

    const handleCreativeAction = async (
        feature: "concept" | "trailer" | "trailerVideo" | "character" | "gameplay" | "world" | "market" | "audio" | "universe" | "refine",
        instruction?: string
    ) => {
        setCreativeLoading(feature);

        try {
            const response = await fetch(`/api/pitch/${params.id}/creative`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ feature, instruction }),
            });

            if (!response.ok) {
                throw new Error("Creative generation failed");
            }

            const data = await response.json() as {
                mode: "append" | "replace";
                block: Block;
            };

            if (data.mode === "replace") {
                const exists = usePitchStore.getState().blocks.some((block) => block.blockId === data.block.blockId);

                if (exists) {
                    updateBlock(data.block.blockId, data.block);
                } else {
                    appendBlock(data.block);
                }

                if (feature === "refine") {
                    setCreativeInstruction("");
                    setActiveStudioTab("pitch");
                } else {
                    setActiveStudioTab(feature === "universe" ? "world" : feature === "trailerVideo" ? "trailer" : feature);
                }
            } else {
                appendBlock(data.block);
                if (feature !== "refine") {
                    setActiveStudioTab(feature === "universe" ? "world" : feature === "trailerVideo" ? "trailer" : feature);
                }
            }
        } catch (error) {
            console.error("Creative action failed", error);
        } finally {
            setCreativeLoading(null);
        }
    };

    const renderBlock = (block: Block, isSlide: boolean = false) => {
        const props = {
            block,
            isActive: !isSlide && activeBlockId === block.blockId,
            onSelect: () => !isSlide && usePitchStore.getState().updateBlock(block.blockId, {}),
            onRegenerate: (newPrompt?: string) => regenerateBlock(block.blockId, newPrompt),
            onUpdate: (content: string) => updateBlock(block.blockId, { content }),
            isReadOnly: isSlide
        };

        switch (block.type) {
            case "text": return <TextBlock {...props} />;
            case "image": return <ImageBlock {...props} />;
            case "video": return <VideoBlock {...props} />;
            case "audio": return <AudioBlock {...props} />;
            case "table":
            case "storyboard": return <TableBlock {...props} />;
            default: return null;
        }
    };

    return (
        <AppLayout>
            <div className="max-w-[900px] mx-auto pb-32">
                {/* Sticky Toolbar */}
                <header className="sticky top-20 z-20 bg-[rgba(26,26,26,0.85)] backdrop-blur-md border border-[var(--border)] rounded-2xl mb-8 p-3 md:p-4 flex flex-col md:flex-row items-center justify-between shadow-card gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link href="/create/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="h-5 w-px bg-[var(--border)] shrink-0" />
                        <input
                            value={pitchTitle}
                            onChange={(e) => updateTitle(e.target.value)}
                            className="bg-transparent text-lg font-jakarta font-bold text-[var(--text-primary)] focus:outline-none w-full md:w-64 placeholder:text-[var(--text-muted)] truncate"
                            placeholder="Untitled Pitch"
                        />
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2 text-[10px] md:text-xs font-inter shrink-0">
                            {saveStatus === 'saving' && <span className="text-[var(--text-muted)] animate-pulse">Saving...</span>}
                            {saveStatus === 'saved' && <span className="text-[#F97316] flex items-center gap-1 font-semibold"><Check className="w-3 h-3" /> Saved</span>}
                            {saveStatus === 'error' && <span className="text-[#EF4444] flex items-center gap-1 font-semibold"><AlertCircle className="w-3 h-3" /> Save failed</span>}
                        </div>

                        <div className="flex items-center border border-[var(--border)] rounded-xl p-0.5 md:p-1 bg-[var(--bg-elevated)] shrink-0">
                            <button
                                onClick={() => setIsSlideMode(false)}
                                className={cn(
                                    "px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all",
                                    !isSlideMode ? "bg-[linear-gradient(135deg,#EF4444,#F97316)] text-white shadow-pink" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                <LayoutGrid className="inline-block w-3 h-3 mr-1" /> <span className="hidden sm:inline">Stream</span>
                            </button>
                            <button
                                onClick={() => setIsSlideMode(true)}
                                className={cn(
                                    "px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all",
                                    isSlideMode ? "bg-[linear-gradient(135deg,#EF4444,#F97316)] text-white shadow-pink" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                <Play className="inline-block w-3 h-3 mr-1" /> <span className="hidden sm:inline">Slides</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <ExportModal
                                blocks={blocks}
                                trigger={
                                    <button className="btn-ghost text-xs md:text-sm py-1.5 md:py-2 px-3 md:px-4">
                                        Export
                                    </button>
                                }
                            />
                            <button className="btn-primary text-xs md:text-sm py-1.5 md:py-2 px-3 md:px-4">
                                Share
                            </button>
                        </div>
                    </div>
                </header>

                {/* Editor Content */}
                {isSlideMode ? (
                    <div className="fixed inset-0 z-50 bg-[var(--bg-base)] flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => setIsSlideMode(false)}
                            className="absolute top-8 right-8 p-3 hover:bg-[rgba(249,115,22,0.08)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="w-full max-w-5xl h-full flex flex-col">
                            <div className="flex-1 overflow-auto p-4">
                                <SlideDeck pitchId={params.id} pitchTitle={pitchTitle} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 md:p-5 border border-gray-100 rounded-2xl bg-white shadow-card space-y-4">
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {[
                                    { id: "concept", label: "Concept Art" },
                                    { id: "trailer", label: "Trailer" },
                                    { id: "pitch", label: "Pitch" },
                                    { id: "gameplay", label: "Gameplay" },
                                    { id: "character", label: "Characters" },
                                    { id: "world", label: "World" },
                                    { id: "market", label: "Market" },
                                    { id: "audio", label: "Audio" },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveStudioTab(tab.id as typeof activeStudioTab);
                                        }}
                                        className={cn(
                                            "px-4 py-2 text-xs font-jakarta font-bold rounded-xl transition-all whitespace-nowrap",
                                            activeStudioTab === tab.id
                                                ? "bg-accent-pink text-white shadow-sm"
                                                : "bg-gray-50 text-gray-500 hover:text-black border border-gray-100"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-dm font-bold text-gray-400 uppercase tracking-widest">Creative Director Tools</p>
                                    <h2 className="text-lg font-jakarta font-bold text-black mt-1">Build concept art, trailer beats, hero reveals, gameplay systems, world lore, audio direction, and market insight</h2>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleCreativeAction("concept")}
                                        disabled={creativeLoading !== null}
                                        className="btn-ghost text-xs md:text-sm py-2 px-4 disabled:opacity-50"
                                    >
                                        <ImageIcon className="inline-block w-4 h-4 mr-2" />
                                        {creativeLoading === "concept" ? "Generating..." : "Concept Art"}
                                    </button>
                                    <button
                                        onClick={() => handleCreativeAction("trailer")}
                                        disabled={creativeLoading !== null}
                                        className="btn-ghost text-xs md:text-sm py-2 px-4 disabled:opacity-50"
                                    >
                                        <Clapperboard className="inline-block w-4 h-4 mr-2" />
                                        {creativeLoading === "trailer" ? "Generating..." : "Generate Trailer"}
                                    </button>
                                    <button
                                        onClick={() => handleCreativeAction("trailerVideo")}
                                        disabled={creativeLoading !== null}
                                        className="btn-primary text-xs md:text-sm py-2 px-4 disabled:opacity-50"
                                    >
                                        <Play className="inline-block w-4 h-4 mr-2" />
                                        {creativeLoading === "trailerVideo" ? "Rendering Video..." : "Generate Video Trailer"}
                                    </button>
                                    <button
                                        onClick={() => handleCreativeAction("character")}
                                        disabled={creativeLoading !== null}
                                        className="btn-ghost text-xs md:text-sm py-2 px-4 disabled:opacity-50"
                                    >
                                        <UserRound className="inline-block w-4 h-4 mr-2" />
                                        {creativeLoading === "character" ? "Generating..." : "Character Studio"}
                                    </button>
                                    <button
                                        onClick={() => handleCreativeAction("gameplay")}
                                        disabled={creativeLoading !== null}
                                        className="btn-ghost text-xs md:text-sm py-2 px-4 disabled:opacity-50"
                                    >
                                        <Swords className="inline-block w-4 h-4 mr-2" />
                                        {creativeLoading === "gameplay" ? "Generating..." : "Gameplay Diagram"}
                                    </button>
                                    <button
                                        onClick={() => handleCreativeAction("world")}
                                        disabled={creativeLoading !== null}
                                        className="btn-ghost text-xs md:text-sm py-2 px-4 disabled:opacity-50"
                                    >
                                        <Globe2 className="inline-block w-4 h-4 mr-2" />
                                        {creativeLoading === "world" ? "Generating..." : "World Builder"}
                                    </button>
                                    <button
                                        onClick={() => handleCreativeAction("market")}
                                        disabled={creativeLoading !== null}
                                        className="btn-ghost text-xs md:text-sm py-2 px-4 disabled:opacity-50"
                                    >
                                        <BarChart3 className="inline-block w-4 h-4 mr-2" />
                                        {creativeLoading === "market" ? "Generating..." : "Market Analyzer"}
                                    </button>
                                    <button
                                        onClick={() => handleCreativeAction("audio")}
                                        disabled={creativeLoading !== null}
                                        className="btn-ghost text-xs md:text-sm py-2 px-4 disabled:opacity-50"
                                    >
                                        <Music4 className="inline-block w-4 h-4 mr-2" />
                                        {creativeLoading === "audio" ? "Generating..." : "Audio Mood"}
                                    </button>
                                    <button
                                        onClick={() => handleCreativeAction("universe")}
                                        disabled={creativeLoading !== null}
                                        className="btn-ghost text-xs md:text-sm py-2 px-4 disabled:opacity-50"
                                    >
                                        <Sparkles className="inline-block w-4 h-4 mr-2" />
                                        {creativeLoading === "universe" ? "Generating..." : "Full Universe"}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-3">
                                <input
                                    value={creativeInstruction}
                                    onChange={(e) => setCreativeInstruction(e.target.value)}
                                    placeholder="Make the world more cyberpunk"
                                    className="input"
                                />
                                <button
                                    onClick={() => handleCreativeAction("refine", creativeInstruction)}
                                    disabled={creativeLoading !== null || !creativeInstruction.trim()}
                                    className="btn-primary text-xs md:text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <WandSparkles className="inline-block w-4 h-4 mr-2" />
                                    {creativeLoading === "refine" ? "Refining..." : "Improve with AI"}
                                </button>
                            </div>
                        </div>

                        {visibleBlocks.length === 0 && (
                            <div className="p-8 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 text-center">
                                <p className="text-sm font-inter text-gray-500">
                                    {activeStudioTab === "pitch"
                                        ? "Generate a pitch to start building the studio."
                                        : `No ${activeStudioTab} blocks yet. Use the tool above to generate them.`}
                                </p>
                            </div>
                        )}

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={visibleBlocks.map(b => b.blockId)}
                                strategy={verticalListSortingStrategy}
                            >
                                {visibleBlocks.map((block) => (
                                    <DraggableBlock key={block.blockId} id={block.blockId}>
                                        {renderBlock(block)}
                                    </DraggableBlock>
                                ))}
                            </SortableContext>
                        </DndContext>

                        {/* Completion or Error Footer */}
                        {streamStatus === 'error' && (
                            <div className="mt-12 p-8 border-2 border-dashed border-accent-pink/30 rounded-2xl bg-accent-pink/[0.02] text-center space-y-4">
                                <div className="flex flex-col items-center justify-center gap-3 text-accent-pink font-inter text-sm">
                                    <div className="p-3 bg-accent-pink/10 rounded-full">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-bold">Generation Interrupted</p>
                                        <p className="text-gray-500 text-xs">The stream was cut off. This could be due to connectivity or insufficient credits.</p>
                                    </div>
                                    <Link href="/settings" className="mt-2 px-6 py-2 bg-accent-pink text-white rounded-xl font-jakarta font-bold text-xs shadow-pink">
                                        Check Credits
                                    </Link>
                                </div>
                            </div>
                        )}

                        {streamStatus === 'complete' && (
                            <div className="mt-12 p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 text-center space-y-4">
                                <div className="flex items-center justify-center gap-2 text-gray-500 font-inter text-sm">
                                    <Check className="w-4 h-4 text-accent-green" />
                                    {visibleBlocks.length} blocks visible · Ready to export
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
