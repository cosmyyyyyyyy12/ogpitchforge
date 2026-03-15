"use client";

import { useEffect, useRef } from "react";
import { usePitchStore } from "@/store/pitchStore";
import { Block, BlockStatus, BlockType } from "@/types/pitch";

export const useStream = (pitchId: string | null) => {
    const { setStream, setStreamStatus, appendBlock, updateBlock } = usePitchStore();
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!pitchId) return;

        console.log(`Connecting to stream for pitch: ${pitchId}`);
        setStreamStatus("connecting");

        const eventSource = new EventSource(`/api/pitch/${pitchId}/stream`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log("SSE connection opened");
            setStreamStatus("streaming");
        };

        eventSource.onerror = () => {
            setStreamStatus("error");
            eventSource.close();
        };

        eventSource.addEventListener("meta", (event) => {
            try {
                const data = JSON.parse(event.data) as { pitchId: string; title: string };
                setStream(data.pitchId, data.title);
            } catch (err) {
                console.error("Failed to parse stream metadata", err);
            }
        });

        eventSource.addEventListener("block", (event) => {
            try {
                const data = JSON.parse(event.data) as Block;
                const { blockId, type, status, content, mediaUrl, order } = data;

                const existingBlocks = usePitchStore.getState().blocks;
                const exists = existingBlocks.find((b) => b.blockId === blockId);

                if (exists) {
                    updateBlock(blockId, {
                        ...data,
                        status,
                        content,
                        mediaUrl,
                    });
                } else {
                    appendBlock({
                        blockId,
                        type: type as BlockType,
                        status: status as BlockStatus,
                        content: content || null,
                        mediaUrl: mediaUrl || null,
                        order: order || existingBlocks.length,
                        altText: data.altText || null,
                        transcript: data.transcript || null,
                        prompt: data.prompt || null,
                        error: data.error || null,
                    });
                }
            } catch (err) {
                console.error("Failed to parse SSE event data", err);
            }
        });

        eventSource.addEventListener("complete", () => {
            console.log("Stream complete");
            setStreamStatus("complete");
            eventSource.close();
        });

        return () => {
            console.log("Cleaning up SSE connection");
            eventSource.close();
            eventSourceRef.current = null;
        };
    }, [pitchId, setStream, setStreamStatus, appendBlock, updateBlock]);

    return {
        isConnected: !!eventSourceRef.current,
    };
};
