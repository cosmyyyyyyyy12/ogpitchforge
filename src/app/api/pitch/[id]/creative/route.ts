import { NextResponse } from "next/server";
import { appendBlockToPitch, getPitch, replaceBlock } from "@/lib/server/pitch-data";
import { generateCreativeFeature } from "@/lib/server/pitch-generation";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const pitch = await getPitch(params.id);

        if (!pitch) {
            return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
        }

        const body = await request.json() as {
            feature?: "concept" | "trailer" | "trailerVideo" | "character" | "gameplay" | "world" | "market" | "audio" | "universe" | "refine";
            instruction?: string;
        };

        if (!body.feature) {
            return NextResponse.json({ error: "Feature is required" }, { status: 400 });
        }

        const result = await generateCreativeFeature(pitch, body.feature, body.instruction);

        if (result.mode === "replace") {
            await replaceBlock(result.block.blockId, result.block);
        } else {
            await appendBlockToPitch(pitch.id, result.block, "complete");
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to generate creative feature", error);
        return NextResponse.json({ error: "Failed to generate creative feature" }, { status: 500 });
    }
}
