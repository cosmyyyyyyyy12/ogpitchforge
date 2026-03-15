"use client";

import React from "react";
import { cn } from "@/lib/utils";

// Genre Select Component
interface GenreSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
}

export const GenreSelect: React.FC<GenreSelectProps> = ({ value, onChange, options }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    onClick={() => onChange(option)}
                    className={cn(
                        "h-10 rounded-xl border text-sm font-semibold transition-all",
                        value === option
                            ? "bg-black text-white border-black"
                            : "bg-gray-50 text-gray-600 border-gray-100 hover:border-gray-300 hover:text-black"
                    )}
                >
                    {option}
                </button>
            ))}
        </div>
    );
};

// Tag Chips Component (Multi-select)
interface TagChipsProps {
    selected: string[];
    onChange: (tags: string[]) => void;
    options: string[];
}

export const TagChips: React.FC<TagChipsProps> = ({ selected, onChange, options }) => {
    const toggleTag = (tag: string) => {
        if (selected.includes(tag)) {
            onChange(selected.filter((t) => t !== tag));
        } else {
            onChange([...selected, tag]);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    onClick={() => toggleTag(option)}
                    className={cn(
                        "px-4 py-2 text-sm font-semibold rounded-full transition-all border",
                        selected.includes(option)
                            ? "bg-accent-pink text-white border-accent-pink shadow-pink"
                            : "bg-gray-50 text-gray-600 border-gray-100 hover:border-accent-pink/40 hover:text-black"
                    )}
                >
                    {option}
                </button>
            ))}
        </div>
    );
};
