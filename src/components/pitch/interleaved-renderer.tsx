"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { ArrowDown, Image as ImageIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { InterleavedContentBlock } from "@/lib/interleaved-content";

interface InterleavedRendererProps {
    blocks: InterleavedContentBlock[];
    isGenerating?: boolean;
}

function ImageFrame({
    src,
    alt,
    fallbackLabel,
}: {
    src?: string | null;
    alt: string;
    fallbackLabel: string;
}) {
    if (!src) {
        return (
            <div className="aspect-video w-full rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-gray-400">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-[10px] font-dm font-bold uppercase tracking-widest">{fallbackLabel}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="w-full h-full object-contain bg-white" />
        </div>
    );
}

export const InterleavedRenderer = React.memo<InterleavedRendererProps>(({
    blocks,
    isGenerating = false,
}) => {
    if (blocks.length === 0 && isGenerating) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="flex items-center gap-2 text-[10px] font-dm font-bold text-accent-pink uppercase tracking-widest">
                    <Sparkles className="w-4 h-4" />
                    Gemini is composing interleaved pitch content
                </div>
                <div className="h-5 w-2/3 rounded-full bg-gray-100" />
                <div className="h-5 w-full rounded-full bg-gray-100" />
                <div className="aspect-video w-full rounded-2xl bg-gray-100" />
                <div className="h-5 w-5/6 rounded-full bg-gray-100" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {blocks.map((block, index) => {
                if (block.type === "text") {
                    return (
                        <div key={`text-${index}`} className="prose prose-invert max-w-none text-[var(--text-primary)]">
                            <ReactMarkdown
                                components={{
                                    h1: ({ children }) => <h1 className="text-3xl font-jakarta font-extrabold text-[var(--text-primary)] mb-6 tracking-tight">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-2xl font-jakarta font-bold text-[var(--text-primary)] mb-4 tracking-tight">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-xl font-jakarta font-bold text-[var(--text-primary)] mb-3 tracking-tight">{children}</h3>,
                                    h4: ({ children }) => <h4 className="text-lg font-jakarta font-bold text-[var(--text-primary)] mb-3 tracking-tight">{children}</h4>,
                                    p: ({ children }) => <p className="text-[var(--text-primary)] font-inter text-lg leading-relaxed mb-4">{children}</p>,
                                    ul: ({ children }) => <ul className="space-y-3 mb-6">{children}</ul>,
                                    ol: ({ children }) => <ol className="space-y-3 mb-6">{children}</ol>,
                                    li: ({ children }) => <li className="ml-5 text-[var(--text-primary)] font-inter text-lg leading-relaxed pl-1 marker:text-[#F97316]">{children}</li>,
                                    hr: () => <div className="my-6 h-px bg-[var(--border)]" />,
                                    strong: ({ children }) => <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>,
                                }}
                            >
                                {block.content}
                            </ReactMarkdown>
                        </div>
                    );
                }

                if (block.type === "image") {
                    return (
                        <div key={`image-${index}`} className="space-y-4">
                            <ImageFrame
                                src={block.mediaUrl}
                                alt={block.caption || block.prompt}
                                fallbackLabel="Concept art pending"
                            />
                            <div className="space-y-2">
                                {block.caption && (
                                    <p className="text-black font-jakarta font-bold text-base tracking-tight">
                                        {block.caption}
                                    </p>
                                )}
                                <p className="text-[11px] font-inter text-gray-400 italic bg-gray-50/50 p-4 rounded-xl border border-gray-100/50 leading-relaxed">
                                    <span className="font-bold text-gray-500 mr-2 not-italic tracking-wider uppercase text-[9px]">Prompt:</span>
                                    {block.prompt}
                                </p>
                            </div>
                        </div>
                    );
                }

                if (block.type === "diagram") {
                    return (
                        <div key={`diagram-${index}`} className="space-y-3">
                            {block.steps.map((step, stepIndex) => (
                                <div key={`${step}-${stepIndex}`} className="flex flex-col items-start gap-3">
                                    <div className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="w-7 h-7 rounded-full bg-accent-pink text-white text-xs font-jakarta font-bold flex items-center justify-center shrink-0">
                                                {stepIndex + 1}
                                            </span>
                                            <p className="text-black font-inter text-base leading-relaxed">{step}</p>
                                        </div>
                                    </div>
                                    {stepIndex < block.steps.length - 1 && (
                                        <ArrowDown className="w-4 h-4 text-gray-300 ml-3" />
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                }

                return (
                    <div key={`storyboard-${index}`} className="space-y-4">
                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {block.scenes.map((scene, sceneIndex) => (
                                <div
                                    key={`${scene.caption}-${sceneIndex}`}
                                    className={cn(
                                        "min-w-[260px] max-w-[260px] rounded-2xl border border-gray-100 bg-gray-50/50 p-3",
                                        "flex-shrink-0"
                                    )}
                                >
                                    <ImageFrame
                                        src={scene.mediaUrl}
                                        alt={scene.caption}
                                        fallbackLabel="Scene rendering"
                                    />
                                    <p className="mt-3 text-black font-inter text-sm leading-relaxed">{scene.caption}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

InterleavedRenderer.displayName = "InterleavedRenderer";
