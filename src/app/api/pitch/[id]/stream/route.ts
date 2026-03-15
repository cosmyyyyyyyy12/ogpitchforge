import { appendBlockToPitch, getPitch, updatePitch } from "@/lib/server/pitch-data";
import { generatePitchBlocks } from "@/lib/server/pitch-generation";

export const runtime = "nodejs";

const encoder = new TextEncoder();

function sendEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
    const pitch = await getPitch(params.id);

    if (!pitch) {
        return new Response("Pitch not found", { status: 404 });
    }

    const stream = new ReadableStream({
        async start(controller) {
            try {
                sendEvent(controller, "meta", {
                    pitchId: pitch.id,
                    title: pitch.title,
                });

                if (pitch.blocks.length > 0) {
                    for (const block of pitch.blocks) {
                        sendEvent(controller, "block", block);
                    }

                    sendEvent(controller, "complete", { pitchId: pitch.id });
                    controller.close();
                    return;
                }

                await updatePitch(pitch.id, { status: "generating" });
                const blocks = await generatePitchBlocks(pitch.input);

                for (const block of blocks) {
                    sendEvent(controller, "block", {
                        ...block,
                        status: "generating",
                        content: block.type === "text" ? null : block.content,
                        mediaUrl: block.type === "image" ? null : block.mediaUrl,
                    });
                    await wait(250);
                    await appendBlockToPitch(pitch.id, block, "generating");
                    sendEvent(controller, "block", block);
                }

                await updatePitch(pitch.id, { status: "complete" });
                sendEvent(controller, "complete", { pitchId: pitch.id });
                controller.close();
            } catch (error) {
                console.error("Pitch stream failed", error);
                sendEvent(controller, "error", { message: "Pitch generation failed" });
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
