"use client";

import { useCallback } from "react";
import { usePitchStore } from "@/store/pitchStore";
import { useUserStore } from "@/store/userStore";

export const useRegenerate = () => {
    const { setBlockRegenerating, updateBlock, setBlockFailed } = usePitchStore();
    const { deductCredit, refundCredit } = useUserStore();

    const regenerateBlock = useCallback(async (blockId: string, newPrompt?: string) => {
        console.log(`Regenerating block: ${blockId}`);

        // Optimistically set status
        setBlockRegenerating(blockId);

        // Optimistically deduct credit
        deductCredit();

        try {
            const response = await fetch(`/api/block/${blockId}/regenerate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt: newPrompt }),
            });

            if (!response.ok) {
                if (response.status === 402) {
                    throw new Error("Insufficient credits");
                }
                throw new Error("Regeneration failed");
            }

            const data = await response.json();
            updateBlock(blockId, data.block);
            console.log(`Block ${blockId} regenerated successfully`);

        } catch (error: unknown) {
            console.error("Regeneration error:", error);
            const message = error instanceof Error ? error.message : "Failed to regenerate";
            setBlockFailed(blockId, message);

            if (message !== "Insufficient credits") {
                refundCredit();
            }
        }
    }, [setBlockRegenerating, updateBlock, setBlockFailed, deductCredit, refundCredit]);

    return { regenerateBlock };
};
