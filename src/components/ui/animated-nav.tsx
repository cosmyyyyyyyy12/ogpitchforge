"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Plus, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
    { label: "Settings", href: "/settings" },
];

export const AnimatedNav: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [mounted, setMounted] = useState(false);
    const navRef = useRef<HTMLElement>(null);
    const lastScrollY = useRef(0);
    const collapseScrollY = useRef(0);
    const pathname = usePathname();
    const EXPAND_THRESHOLD = 80;

    const setExpandedWidth = useCallback(() => {
        if (navRef.current && isExpanded) {
            navRef.current.style.width = "auto";
            const w = navRef.current.getBoundingClientRect().width;
            navRef.current.style.width = `${w}px`;
        }
    }, [isExpanded]);

    useEffect(() => {
        setExpandedWidth();
        window.addEventListener("resize", setExpandedWidth);
        return () => window.removeEventListener("resize", setExpandedWidth);
    }, [setExpandedWidth]);

    useEffect(() => {
        const savedTheme = window.localStorage.getItem("pitchforge-theme");
        const nextTheme = savedTheme === "dark" ? "dark" : "light";
        document.documentElement.dataset.theme = nextTheme;
        setTheme(nextTheme);
        setMounted(true);
    }, []);

    useEffect(() => {
        const onScroll = () => {
            const current = window.scrollY;

            if (isExpanded && current > lastScrollY.current && current > 150) {
                // Collapse
                setIsExpanded(false);
                collapseScrollY.current = current;
            } else if (
                !isExpanded &&
                current < lastScrollY.current &&
                collapseScrollY.current - current > EXPAND_THRESHOLD
            ) {
                // Expand
                setIsExpanded(true);
            }

            lastScrollY.current = current;
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [isExpanded]);

    // Recalculate width when expanding
    useEffect(() => {
        if (isExpanded && navRef.current) {
            requestAnimationFrame(setExpandedWidth);
        }
    }, [isExpanded, setExpandedWidth]);

    const handleNavClick = (e: React.MouseEvent) => {
        if (!isExpanded) {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(true);
        }
    };

    const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        document.documentElement.dataset.theme = nextTheme;
        window.localStorage.setItem("pitchforge-theme", nextTheme);
    };

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
            <nav
                ref={navRef}
                onClick={handleNavClick}
                className={cn(
                    "flex items-center overflow-hidden h-12 rounded-full border backdrop-blur-[14px]",
                    "transition-[width] duration-[550ms] ease-[cubic-bezier(.22,1,.36,1)]",
                    "bg-[var(--nav-bg)] border-[var(--nav-border)] shadow-[var(--nav-shadow)]",
                    isExpanded
                        ? "pr-4"
                        : "!w-12 justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform duration-200"
                )}
            >
                {/* Logo */}
                <div
                    className={cn(
                        "flex items-center pl-4 pr-2 transition-all duration-[400ms] ease-[cubic-bezier(.22,1,.36,1)]",
                        !isExpanded && "opacity-0 -translate-x-6 -rotate-180"
                    )}
                >
                    <Link href="/create/dashboard" className="flex items-center gap-1.5">
                        <div className="w-6 h-6 bg-accent-pink rounded-lg flex items-center justify-center">
                            <Zap className="w-3.5 h-3.5 text-white fill-white" />
                        </div>
                        <span className="font-jakarta font-extrabold text-[15px] tracking-tight text-[var(--text-primary)] whitespace-nowrap">
                            Pitch<span className="text-accent-pink">Forge</span>
                        </span>
                    </Link>
                </div>

                {/* Links */}
                <div className={cn("flex items-center gap-5", !isExpanded && "pointer-events-none")}>
                    {links.map((link, i) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "text-sm font-medium whitespace-nowrap transition-all duration-300",
                                    isActive
                                        ? "text-[var(--text-primary)] font-bold"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                                    !isExpanded && "opacity-0 -translate-x-5 scale-95"
                                )}
                                style={{
                                    transitionDelay: isExpanded
                                        ? `${120 + i * 50}ms`
                                        : "0ms",
                                }}
                            >
                                {link.label}
                            </Link>
                        );
                    })}

                    {/* New Pitch CTA */}
                    <Link
                        href="/create"
                        className={cn(
                            "flex items-center gap-1.5 bg-accent-pink text-white text-sm font-bold px-4 py-1.5 rounded-full whitespace-nowrap transition-all duration-300 hover:shadow-pink",
                            !isExpanded && "opacity-0 -translate-x-5 scale-95"
                        )}
                        style={{
                            transitionDelay: isExpanded ? "320ms" : "0ms",
                        }}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Pitch
                    </Link>

                    <button
                        type="button"
                        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                        onClick={toggleTheme}
                        className={cn(
                            "ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--nav-border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[rgba(249,115,22,0.38)] hover:bg-[rgba(249,115,22,0.08)]",
                            !isExpanded && "opacity-0 -translate-x-5 scale-95"
                        )}
                        style={{
                            transitionDelay: isExpanded ? "380ms" : "0ms",
                        }}
                    >
                        {!mounted ? <Sun className="h-4 w-4" /> : theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                </div>

                {/* Collapsed center icon */}
                <div
                    className={cn(
                        "absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
                        isExpanded ? "opacity-0 scale-75" : "opacity-100 scale-100"
                    )}
                >
                    <svg
                        className="w-[22px] h-[22px] stroke-[var(--text-primary)] stroke-2"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </div>
            </nav>
        </div>
    );
};

export default AnimatedNav;
