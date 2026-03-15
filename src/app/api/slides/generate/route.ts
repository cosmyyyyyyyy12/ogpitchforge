import { NextResponse } from "next/server";
import { getPitch, updatePitchSlides } from "@/lib/server/pitch-data";
import { generateInvestorSlides } from "@/lib/gemini";
import { InvestorSlide } from "@/types/pitch";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const body = await request.json() as { pitchId?: string; force?: boolean };

        if (!body.pitchId) {
            return NextResponse.json({ error: "pitchId is required" }, { status: 400 });
        }

        const pitch = await getPitch(body.pitchId);
        if (!pitch) {
            return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
        }

        if (!body.force && pitch.slides.length > 0) {
            return NextResponse.json({ slides: pitch.slides, cached: true });
        }

        const slides = await generateInvestorSlides(pitch);
        await updatePitchSlides(pitch.id, slides);

        return NextResponse.json({ slides, cached: false });
    } catch (error) {
        console.error("Failed to generate slides", error);
        return NextResponse.json({ error: "Failed to generate slides" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json() as { pitchId?: string; slides?: InvestorSlide[] };

        if (!body.pitchId || !Array.isArray(body.slides)) {
            return NextResponse.json({ error: "pitchId and slides are required" }, { status: 400 });
        }

        const pitch = await updatePitchSlides(body.pitchId, body.slides);
        if (!pitch) {
            return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
        }

        return NextResponse.json({ slides: pitch.slides });
    } catch (error) {
        console.error("Failed to update slides", error);
        return NextResponse.json({ error: "Failed to update slides" }, { status: 500 });
    }
}
