"use client";

import { useEffect, useCallback } from "react";
import { usePitchStore } from "@/store/pitchStore";

export const useAutosave = () => {
    const { pitchId, blocks, pitchTitle, isDirty, saveStatus, setSaveStatus, setIsDirty } = usePitchStore();

    const savePitch = useCallback(async () => {
        if (!pitchId || !isDirty || saveStatus === "saving") return;

        console.log("Autosaving pitch...");
        setSaveStatus("saving");

        try {
            const response = await fetch(`/api/pitch/${pitchId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: pitchTitle,
                    blocks: blocks,
                }),
            });

            if (!response.ok) throw new Error("Save failed");

            setSaveStatus("saved");
            setIsDirty(false);
            console.log("Autosave successful");
        } catch (error) {
            console.error("Autosave error:", error);
            setSaveStatus("error");
        }
    }, [pitchId, isDirty, saveStatus, blocks, pitchTitle, setSaveStatus, setIsDirty]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (isDirty) {
                savePitch();
            }
        }, 2000); // 2 second debounce

        return () => clearTimeout(timer);
    }, [isDirty, savePitch]);

    // Secondary heartbeat save every 60 seconds if dirty
    useEffect(() => {
        const interval = setInterval(() => {
            if (isDirty) {
                savePitch();
            }
        }, 60000);

        return () => clearInterval(interval);
    }, [isDirty, savePitch]);

    return { savePitch };
};
