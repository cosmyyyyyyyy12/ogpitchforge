import { NextResponse } from "next/server";
import { listPitches } from "@/lib/server/pitch-data";

export const runtime = "nodejs";

export async function GET() {
    try {
        const pitches = await listPitches();
        return NextResponse.json({ pitches });
    } catch (error) {
        console.error("Failed to list pitches", error);
        return NextResponse.json({ error: "Failed to list pitches" }, { status: 500 });
    }
}
