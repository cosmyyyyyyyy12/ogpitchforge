"use client";

import React, { useState } from "react";
import AppLayout from "@/components/layout/app-layout";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUserStore } from "@/store/userStore";
import { GenreSelect, TagChips } from "@/components/create/form-elements";
import { TransitionOverlay } from "@/components/create/transition-overlay";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";
import { usePitchStore } from "@/store/pitchStore";

const formSchema = z.object({
    title: z.string().min(1, "Game title is required"),
    genre: z.string().min(1, "Please select a genre"),
    mechanic: z.string().min(10, "Describe your core mechanic (min 10 chars)"),
    tone: z.array(z.string()).min(1, "Select at least one tone"),
    audience: z.string().min(1, "Target audience is required"),
    platform: z.array(z.string()).min(1, "Select at least one platform"),
});

type FormData = z.infer<typeof formSchema>;

const GENRES = ["RPG", "FPS", "Strategy", "Roguelike", "Platformer", "Horror", "Puzzle", "Fighting", "Simulation", "Other"];
const TONES = ["Dark", "Gritty", "Funny", "Retro", "Surreal", "Epic", "Minimalist", "Psychedelic"];
const PLATFORMS = ["PC", "Console", "Mobile", "VR"];

export default function CreatePitchPage() {
    const [isGenerating, setIsGenerating] = useState(false);
    const { credits, deductCredit, refundCredit } = useUserStore();
    const setStream = usePitchStore((state) => state.setStream);
    const router = useRouter();

    const { control, register, handleSubmit, formState: { errors, isValid }, watch } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            genre: "",
            mechanic: "",
            tone: [],
            audience: "",
            platform: [],
        },
        mode: "onChange"
    });

    const gameTitle = watch("title");

    const onSubmit = async (values: FormData) => {
        if (credits === 0) return;
        setIsGenerating(true);
        deductCredit();

        try {
            const response = await fetch("/api/pitch", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                throw new Error("Failed to create pitch");
            }

            const data = await response.json();
            setStream(data.id, data.title);
            router.push(`/pitch/${data.id}`);
        } catch (error) {
            console.error("Failed to create pitch", error);
            refundCredit();
            setIsGenerating(false);
        }
    };

    return (
        <AppLayout>
            <TransitionOverlay isVisible={isGenerating} gameTitle={gameTitle} />

            <div className="max-w-[680px] mx-auto pt-4 pb-24 space-y-10">
                <div className="space-y-2">
                    <h1 className="text-4xl font-jakarta font-extrabold text-[var(--text-primary)] tracking-tight">New Pitch</h1>
                    <p className="text-[var(--text-muted)] font-inter text-base">Describe your game. We&apos;ll handle the rest.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="space-y-2">
                        <label className="text-sm font-jakarta font-bold text-[var(--text-primary)]">Game Title</label>
                        <input
                            {...register("title")}
                            placeholder="e.g. Shadows of the Moon"
                            className="input"
                        />
                        {errors.title && <p className="text-xs text-accent-pink font-inter">{errors.title.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-jakarta font-bold text-[var(--text-primary)]">Genre</label>
                        <Controller
                            name="genre"
                            control={control}
                            render={({ field }) => (
                                <GenreSelect value={field.value} onChange={field.onChange} options={GENRES} />
                            )}
                        />
                        {errors.genre && <p className="text-xs text-accent-pink font-inter">{errors.genre.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-jakarta font-bold text-[var(--text-primary)]">Core Mechanic</label>
                        <textarea
                            {...register("mechanic")}
                            placeholder="e.g. Parry-based combat that slows time on perfect block"
                            className="input resize-none h-32"
                        />
                        {errors.mechanic && <p className="text-xs text-accent-pink font-inter">{errors.mechanic.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-jakarta font-bold text-[var(--text-primary)]">Tone</label>
                        <Controller
                            name="tone"
                            control={control}
                            render={({ field }) => (
                                <TagChips selected={field.value} onChange={field.onChange} options={TONES} />
                            )}
                        />
                        {errors.tone && <p className="text-xs text-accent-pink font-inter">{errors.tone.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-jakarta font-bold text-[var(--text-primary)]">Target Audience</label>
                        <input
                            {...register("audience")}
                            placeholder="e.g. Sekiro fans, ages 18-35"
                            className="input"
                        />
                        {errors.audience && <p className="text-xs text-accent-pink font-inter">{errors.audience.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-jakarta font-bold text-[var(--text-primary)]">Platform</label>
                        <Controller
                            name="platform"
                            control={control}
                            render={({ field }) => (
                                <TagChips selected={field.value} onChange={field.onChange} options={PLATFORMS} />
                            )}
                        />
                        {errors.platform && <p className="text-xs text-accent-pink font-inter">{errors.platform.message}</p>}
                    </div>

                    <div className="space-y-4 pt-4">
                        <div className={cn(
                            "p-4 rounded-xl flex items-center justify-between text-sm font-inter backdrop-blur-sm",
                            credits > 0
                                ? "bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.25)] text-[#F97316]"
                                : "bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] text-[#EF4444]"
                        )}>
                            <span className="flex items-center gap-1.5 font-semibold">
                                <Zap className="w-4 h-4" /> Cost: 1 Credit
                            </span>
                            <span className="font-bold">
                                {credits > 0
                                    ? `${credits} credits remaining`
                                    : (
                                        <Link href="/settings" className="underline hover:text-[var(--text-primary)] transition-colors">
                                            0 Credits — Buy more
                                        </Link>
                                    )}
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={!isValid || credits === 0 || isGenerating}
                            className="w-full h-14 btn-primary font-jakarta font-extrabold text-base rounded-xl hover:scale-[1.01] active:scale-[0.99] disabled:bg-[var(--border)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100 transition-all shadow-pink"
                        >
                            Generate Pitch
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
