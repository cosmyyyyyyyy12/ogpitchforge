"use client";

import React from "react";
import { AnimatedNav } from "@/components/ui/animated-nav";

interface AppLayoutProps {
    children: React.ReactNode;
    className?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, className = "" }) => {
    return (
        <div className="min-h-screen bg-background">
            <AnimatedNav />
            <main className={`pt-24 pb-16 px-6 lg:px-8 ${className}`}>
                {children}
            </main>
        </div>
    );
};

export default AppLayout;
