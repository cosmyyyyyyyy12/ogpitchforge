import { NextResponse } from "next/server";
import { getPitchByBlockId, replaceBlock } from "@/lib/server/pitch-data";
import { regeneratePitchBlock } from "@/lib/server/pitch-generation";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { blockId: string } }) {
    try {
        const body = await request.json();
        const match = await getPitchByBlockId(params.blockId);

        if (!match) {
            return NextResponse.json({ error: "Block not found" }, { status: 404 });
        }

        const regenerated = await regeneratePitchBlock(match.pitch, match.block, body.prompt);
        await replaceBlock(params.blockId, regenerated.block);

        return NextResponse.json(regenerated);
    } catch (error) {
        console.error("Failed to regenerate block", error);
        return NextResponse.json({ error: "Failed to regenerate block" }, { status: 500 });
    }
}
