"use client";

import React from "react";
import { RefreshCw, ArrowUp, ArrowDown } from "lucide-react";
import { InvestorSlide } from "@/types/pitch";

interface SlideCardProps {
    slide: InvestorSlide;
    index: number;
    total: number;
    presentationMode: "dark" | "light";
    onChange: (slide: InvestorSlide) => void;
    onMove: (from: number, to: number) => void;
    onRegenerate: (index: number) => void;
    regenerating: boolean;
}

export function SlideCard({
    slide,
    index,
    total,
    presentationMode,
    onChange,
    onMove,
    onRegenerate,
    regenerating,
}: SlideCardProps) {
    const isDark = presentationMode === "dark";

    return (
        <div className={`rounded-[28px] border p-6 md:p-8 shadow-card ${isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-950"}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-3 text-xs font-jakarta font-bold ${isDark ? "bg-white/10 text-orange-300" : "bg-orange-100 text-orange-700"}`}>
                            {index + 1}
                        </span>
                        <input
                            value={slide.title}
                            onChange={(e) => onChange({ ...slide, title: e.target.value })}
                            className={`w-full bg-transparent text-2xl font-jakarta font-extrabold tracking-tight focus:outline-none ${isDark ? "text-white" : "text-slate-950"}`}
                        />
                    </div>

                    <div className="grid gap-3">
                        {slide.bullets.map((bullet, bulletIndex) => (
                            <div key={bulletIndex} className="flex gap-3">
                                <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${isDark ? "bg-orange-400" : "bg-orange-500"}`} />
                                <textarea
                                    value={bullet}
                                    onChange={(e) => {
                                        const bullets = [...slide.bullets];
                                        bullets[bulletIndex] = e.target.value;
                                        onChange({ ...slide, bullets });
                                    }}
                                    className={`min-h-[56px] w-full resize-none rounded-2xl border px-4 py-3 text-sm leading-relaxed focus:outline-none ${isDark ? "border-white/10 bg-white/5 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-row gap-3 md:flex-col md:items-end">
                    <input
                        value={slide.metric ?? ""}
                        onChange={(e) => onChange({ ...slide, metric: e.target.value })}
                        placeholder="Key metric"
                        className={`min-w-[180px] rounded-2xl border px-4 py-3 text-sm font-semibold focus:outline-none ${isDark ? "border-white/10 bg-orange-500/10 text-orange-100" : "border-orange-200 bg-orange-50 text-orange-700"}`}
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => onMove(index, Math.max(0, index - 1))}
                            disabled={index === 0}
                            className="rounded-xl border px-3 py-2 disabled:opacity-40"
                        >
                            <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onMove(index, Math.min(total - 1, index + 1))}
                            disabled={index === total - 1}
                            className="rounded-xl border px-3 py-2 disabled:opacity-40"
                        >
                            <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onRegenerate(index)}
                            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
                            Regenerate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
