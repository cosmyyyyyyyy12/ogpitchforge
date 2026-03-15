import { NextResponse } from "next/server";
import { deletePitch, getPitch, updatePitch } from "@/lib/server/pitch-data";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
    const pitch = await getPitch(params.id);

    if (!pitch) {
        return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
    }

    return NextResponse.json({ pitch });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();
        const pitch = await updatePitch(params.id, {
            title: body.title,
            blocks: body.blocks,
        });

        if (!pitch) {
            return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
        }

        return NextResponse.json({ pitch });
    } catch (error) {
        console.error("Failed to update pitch", error);
        return NextResponse.json({ error: "Failed to update pitch" }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
    try {
        const deleted = await deletePitch(params.id);

        if (!deleted) {
            return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete pitch", error);
        return NextResponse.json({ error: "Failed to delete pitch" }, { status: 500 });
    }
}
