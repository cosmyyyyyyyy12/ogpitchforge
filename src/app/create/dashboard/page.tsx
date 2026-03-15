"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/app-layout";
import { ProjectCard } from "@/components/dashboard/project-card";
import { Copy, Sparkles } from "lucide-react";
import Link from "next/link";
import { useUserStore } from "@/store/userStore";

interface DashboardPitch {
    id: string;
    title: string;
    date: string;
    status: "Completed" | "Generating" | "Draft";
    thumbnail?: string;
}

export default function DashboardPage() {
    const { displayName } = useUserStore();
    const [projects, setProjects] = useState<DashboardPitch[]>([]);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const response = await fetch("/api/pitches");
                const data = await response.json();
                setProjects(data.pitches ?? []);
            } catch (error) {
                console.error("Failed to load pitches", error);
            }
        };

        void loadProjects();
    }, []);

    const handleRenamed = (id: string, title: string) => {
        setProjects((current) => current.map((project) => project.id === id ? { ...project, title } : project));
    };

    const handleDeleted = (id: string) => {
        setProjects((current) => current.filter((project) => project.id !== id));
    };

    const hasProjects = projects.length > 0;

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-10">
                <div className="space-y-2">
                    <h1 className="text-4xl font-jakarta font-extrabold text-white tracking-tight">
                        {displayName ? `Welcome, ${displayName.split(" ")[0]}` : "Your Pitches"}
                    </h1>
                    <p className="text-slate-400 font-inter text-base">
                        Explore the flow, create pitches, and test the experience as a guest.
                    </p>
                </div>

                {hasProjects ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <ProjectCard key={project.id} {...project} onRenamed={handleRenamed} onDeleted={handleDeleted} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center">
                        <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center">
                            <Copy className="w-8 h-8 text-slate-600" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-jakarta font-bold text-white">No pitches yet</h2>
                            <p className="text-slate-400 text-sm font-inter">
                                Create your first pitch and start your journey.
                            </p>
                        </div>
                        <Link
                            href="/create"
                            className="inline-flex items-center gap-2 bg-accent-pink text-white font-jakarta font-bold text-sm px-6 py-3 rounded-xl hover:shadow-pink hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <Sparkles className="w-4 h-4" />
                            Create your first pitch
                        </Link>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
