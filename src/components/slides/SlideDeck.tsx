"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Download, FileText, Moon, Sun, Sparkles } from "lucide-react";
import { InvestorSlide } from "@/types/pitch";
import { SlideCard } from "@/components/slides/SlideCard";

interface SlideDeckProps {
    pitchId: string;
    pitchTitle: string;
}

function arrayMoveItem<T>(items: T[], from: number, to: number) {
    const copy = [...items];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
}

export function SlideDeck({ pitchId, pitchTitle }: SlideDeckProps) {
    const [slides, setSlides] = useState<InvestorSlide[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
    const [presentationMode, setPresentationMode] = useState<"dark" | "light">("dark");
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadSlides = async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const response = await fetch("/api/slides/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pitchId }),
                });

                if (!response.ok) {
                    throw new Error("Failed to load slides");
                }

                const data = await response.json() as { slides: InvestorSlide[] };
                if (!cancelled) {
                    setSlides(data.slides);
                }
            } catch (error) {
                console.error("Failed to load slides", error);
                if (!cancelled) {
                    setLoadError("We couldn't build the deck yet. Try regenerating the presentation.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadSlides();
        return () => {
            cancelled = true;
        };
    }, [pitchId]);

    const persistSlides = async (nextSlides: InvestorSlide[]) => {
        setSlides(nextSlides);
        setSaving(true);
        try {
            await fetch("/api/slides/generate", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pitchId, slides: nextSlides }),
            });
        } catch (error) {
            console.error("Failed to save slides", error);
        } finally {
            setSaving(false);
        }
    };

    const regenerateDeck = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const response = await fetch("/api/slides/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pitchId, force: true }),
            });

            if (!response.ok) {
                throw new Error("Failed to regenerate deck");
            }

            const data = await response.json() as { slides: InvestorSlide[] };
            setSlides(data.slides);
        } catch (error) {
            console.error("Failed to regenerate deck", error);
            setLoadError("Deck generation failed again. Please retry in a moment.");
        } finally {
            setLoading(false);
        }
    };

    const regenerateSingleSlide = async (index: number) => {
        setRegeneratingIndex(index);
        try {
            const response = await fetch("/api/slides/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pitchId, force: true }),
            });

            if (!response.ok) {
                throw new Error("Failed to regenerate slides");
            }

            const data = await response.json() as { slides: InvestorSlide[] };
            if (data.slides[index]) {
                const nextSlides = slides.map((slide, currentIndex) => currentIndex === index ? data.slides[index] : slide);
                await persistSlides(nextSlides);
            }
        } catch (error) {
            console.error("Failed to regenerate slide", error);
        } finally {
            setRegeneratingIndex(null);
        }
    };

    const exportText = useMemo(() => slides.map((slide, index) => [
        `Slide ${index + 1}: ${slide.title}`,
        ...(slide.metric ? [`Metric: ${slide.metric}`] : []),
        ...slide.bullets.map((bullet) => `- ${bullet}`),
    ].join("\n")).join("\n\n"), [slides]);

    const handleExport = (extension: "pdf" | "ppt") => {
        const blob = new Blob([exportText], { type: extension === "pdf" ? "application/pdf" : "application/vnd.ms-powerpoint" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${pitchTitle.replace(/\s+/g, "-").toLowerCase()}-deck.${extension}`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="rounded-[32px] border border-[var(--border)] bg-[var(--bg-surface)] p-10 shadow-card">
                <div className="flex items-center gap-3 text-sm font-jakarta font-bold text-[var(--text-primary)]">
                    <Sparkles className="h-4 w-4 text-[#F97316]" />
                    Building investor-ready slide deck...
                </div>
            </div>
        );
    }

    if (loadError || slides.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-card md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-dm font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Investor Slides</p>
                        <h2 className="mt-2 text-2xl font-jakarta font-extrabold text-[var(--text-primary)]">VC-ready presentation for {pitchTitle}</h2>
                    </div>
                    <button type="button" onClick={regenerateDeck} className="btn-primary">
                        Generate Deck
                    </button>
                </div>

                <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center shadow-card">
                    <p className="text-lg font-jakarta font-bold text-[var(--text-primary)]">Slides are not ready yet</p>
                    <p className="mt-3 text-sm font-inter text-[var(--text-muted)]">
                        {loadError ?? "Generate an investor-ready deck from your current pitch."}
                    </p>
                    <button type="button" onClick={regenerateDeck} className="btn-primary mt-6">
                        Build Investor Deck
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-card md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-xs font-dm font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Investor Slides</p>
                    <h2 className="mt-2 text-2xl font-jakarta font-extrabold text-[var(--text-primary)]">VC-ready presentation for {pitchTitle}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setPresentationMode((mode) => mode === "dark" ? "light" : "dark")}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-jakarta font-bold text-[var(--text-primary)]"
                    >
                        {presentationMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        {presentationMode === "dark" ? "Light Deck" : "Dark Deck"}
                    </button>
                    <button type="button" onClick={() => handleExport("pdf")} className="inline-flex items-center gap-2 btn-ghost">
                        <FileText className="h-4 w-4" />
                        Export PDF
                    </button>
                    <button type="button" onClick={() => handleExport("ppt")} className="inline-flex items-center gap-2 btn-primary">
                        <Download className="h-4 w-4" />
                        Export PPT
                    </button>
                </div>
            </div>

            {saving && <p className="text-sm font-inter text-[var(--text-muted)]">Saving slide updates...</p>}

            <div className="grid gap-6">
                {slides.map((slide, index) => (
                    <SlideCard
                        key={slide.id}
                        slide={slide}
                        index={index}
                        total={slides.length}
                        presentationMode={presentationMode}
                        regenerating={regeneratingIndex === index}
                        onRegenerate={regenerateSingleSlide}
                        onMove={(from, to) => {
                            if (from === to) return;
                            void persistSlides(arrayMoveItem(slides, from, to));
                        }}
                        onChange={(nextSlide) => {
                            const nextSlides = slides.map((slideItem) => slideItem.id === nextSlide.id ? nextSlide : slideItem);
                            void persistSlides(nextSlides);
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
