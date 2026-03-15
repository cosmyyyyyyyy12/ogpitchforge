"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Block } from "@/types/pitch";

interface ExportModalProps {
    blocks: Block[];
    trigger: React.ReactNode;
}

export const ExportModal: React.FC<ExportModalProps> = ({ blocks, trigger }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>(blocks.map(b => b.blockId));
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [isDone, setIsDone] = useState(false);

    const toggleBlock = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleExport = () => {
        setIsExporting(true);
        setExportProgress(0);
        setIsDone(false);

        // Simulate PDF generation steps
        // let currentStep = 0; // Removed as unused

        const interval = setInterval(() => {
            setExportProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsDone(true);
                    return 100;
                }
                return prev + 5;
            });
        }, 150);
    };

    const reset = () => {
        setIsExporting(false);
        setExportProgress(0);
        setIsDone(false);
    };

    return (
        <Dialog onOpenChange={(open: boolean) => !open && reset()}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
                {!isExporting ? (
                    <>
                        <DialogHeader className="p-8 pb-0">
                            <DialogTitle className="text-2xl font-jakarta font-extrabold text-black">Export Deck</DialogTitle>
                            <DialogDescription className="text-gray-500 font-inter text-sm pt-2">
                                Select the sections you want to include in your PDF deck.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-8 space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide">
                            {blocks.map((block, index) => (
                                <div
                                    key={block.blockId}
                                    onClick={() => toggleBlock(block.blockId)}
                                    className={cn(
                                        "flex items-center space-x-4 p-4 rounded-2xl border transition-all cursor-pointer",
                                        selectedIds.includes(block.blockId)
                                            ? "border-accent-pink/30 bg-accent-pink/[0.02]"
                                            : "border-gray-50 bg-gray-50/50 hover:border-gray-200"
                                    )}
                                >
                                    <Checkbox
                                        id={block.blockId}
                                        checked={selectedIds.includes(block.blockId)}
                                        onCheckedChange={() => toggleBlock(block.blockId)}
                                        className="data-[state=checked]:bg-accent-pink data-[state=checked]:border-accent-pink"
                                    />
                                    <div className="flex-1 space-y-0.5">
                                        <p className="text-xs font-dm font-bold text-gray-400 uppercase tracking-widest leading-none">
                                            Slide {index + 1}
                                        </p>
                                        <p className="text-sm font-jakarta font-bold text-black truncate max-w-[300px]">
                                            {block.type === 'text' ? (block.content?.split('\n')[0].replace('# ', '') || 'Narrative') :
                                                block.type === 'image' ? (block.prompt?.slice(0, 40) + '...' || 'Visual Asset') :
                                                    block.type === 'video' ? 'Trailer Video' :
                                                    block.type.toUpperCase()}
                                        </p>
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-300 uppercase px-2 py-1 rounded bg-white border border-gray-50">
                                        {block.type}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <DialogFooter className="p-8 pt-0 flex sm:justify-between items-center bg-gray-50/50 border-t border-gray-100">
                            <p className="text-xs font-jakarta font-bold text-gray-500">
                                {selectedIds.length} slides selected
                            </p>
                            <button
                                onClick={handleExport}
                                disabled={selectedIds.length === 0}
                                className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl font-jakarta font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:scale-100"
                            >
                                <FileText className="w-4 h-4" /> Export PDF
                            </button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="p-12 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-300">
                        {isDone ? (
                            <div className="w-20 h-20 bg-accent-green/10 rounded-full flex items-center justify-center animate-bounce">
                                <CheckCircle2 className="w-10 h-10 text-accent-green" />
                            </div>
                        ) : (
                            <div className="relative w-20 h-20">
                                <Loader2 className="w-20 h-20 text-accent-pink animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-dm font-bold text-black">
                                    {Math.round(exportProgress)}%
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <h3 className="text-xl font-jakarta font-extrabold text-black">
                                {isDone ? "Your Deck is Ready!" : "Building your Deck..."}
                            </h3>
                            <p className="text-gray-500 font-inter text-sm px-8">
                                {isDone ? "The file 'shadow-protocols-pitch.pdf' has been saved." : "We're optimizing your assets and rendering high-quality slides."}
                            </p>
                        </div>

                        {isDone ? (
                            <button
                                onClick={reset}
                                className="w-full h-12 bg-black text-white font-jakarta font-bold text-sm rounded-xl hover:scale-[1.02] transition-all"
                            >
                                Done
                            </button>
                        ) : (
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-accent-pink h-full transition-all duration-300 ease-out"
                                    style={{ width: `${exportProgress}%` }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
