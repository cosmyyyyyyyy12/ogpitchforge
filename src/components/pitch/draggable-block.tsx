"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableBlockProps {
    id: string;
    children: React.ReactNode;
}

export const DraggableBlock: React.FC<DraggableBlockProps> = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative group/drag transition-all",
                isDragging && "z-50 opacity-50 scale-[1.02] shadow-pink-strong border-2 border-dashed border-accent-pink rounded-2xl"
            )}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/drag:opacity-100 cursor-grab active:cursor-grabbing p-3 text-gray-300 hover:text-black transition-all bg-white hover:bg-gray-50 rounded-xl"
            >
                <GripVertical className="w-5 h-5" />
            </div>

            {children}
        </div>
    );
};
