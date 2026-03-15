import { NextResponse } from "next/server";
import { createPitch } from "@/lib/server/pitch-data";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const pitch = await createPitch({
            title: body.title ?? "",
            genre: body.genre ?? "",
            mechanic: body.mechanic ?? "",
            tone: Array.isArray(body.tone) ? body.tone : [],
            audience: body.audience ?? "",
            platform: Array.isArray(body.platform) ? body.platform : [],
        });

        return NextResponse.json({
            id: pitch.id,
            title: pitch.title,
        });
    } catch (error) {
        console.error("Failed to create pitch", error);
        return NextResponse.json({ error: "Failed to create pitch" }, { status: 500 });
    }
}
