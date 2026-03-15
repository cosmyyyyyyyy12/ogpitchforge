import { randomUUID } from "crypto";
import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { Block, BlockType } from "@/types/pitch";
import { PitchInput, StoredPitch } from "@/lib/server/pitch-data";
import {
    InterleavedContentBlock,
    interleavedBlocksToPlainText,
    parseStoredInterleavedContent,
    serializeInterleavedBlocks,
} from "@/lib/interleaved-content";

function findServiceAccountFile() {
    const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

    if (configuredPath) {
        const absoluteConfiguredPath = path.isAbsolute(configuredPath)
            ? configuredPath
            : path.resolve(process.cwd(), configuredPath);

        if (existsSync(absoluteConfiguredPath)) {
            return absoluteConfiguredPath;
        }
    }

    const candidates = readdirSync(process.cwd())
        .filter((file) => file.endsWith(".json"))
        .map((file) => path.join(process.cwd(), file));

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(readFileSync(candidate, "utf8")) as { type?: string; client_email?: string };

            if (parsed.type === "service_account" && parsed.client_email) {
                return candidate;
            }
        } catch {
            // Ignore non-service-account JSON files.
        }
    }

    return null;
}

function getClient() {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION;
    const credentialsPath = findServiceAccountFile();

    if (!project || !location) {
        return null;
    }

    if (credentialsPath) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    }

    return new GoogleGenAI({
        vertexai: true,
        project,
        location,
    });
}

function safeModel(name: string | undefined, fallback: string) {
    return name && name.trim() ? name.trim() : fallback;
}

function getPitchModel() {
    return safeModel(process.env.GEMINI_MODEL, "gemini-1.5-flash");
}

function getVideoModel() {
    return safeModel(process.env.VIDEO_MODEL ?? process.env.VEO_MODEL, "veo-3.1-fast-generate-001");
}

function getImageModel() {
    return safeModel(process.env.GEMINI_IMAGE_MODEL, "gemini-2.5-flash-image");
}

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function serializeInput(input: PitchInput) {
    return [
        `Title: ${input.title}`,
        `Genre: ${input.genre}`,
        `Core mechanic: ${input.mechanic}`,
        `Tone: ${input.tone.join(", ")}`,
        `Audience: ${input.audience}`,
        `Platforms: ${input.platform.join(", ")}`,
    ].join("\n");
}

function summarizePitchContext(pitch: StoredPitch) {
    const narrative = getPrimaryNarrativeText(pitch);

    return {
        title: pitch.title,
        narrative,
        summary: [
            `Title: ${pitch.title}`,
            "",
            "Current pitch narrative:",
            narrative,
        ].join("\n"),
    };
}

function getCreativeBlockContent(pitch: StoredPitch, promptTag: string) {
    const block = pitch.blocks.find((entry) => entry.prompt === promptTag);

    if (!block?.content) {
        return "";
    }

    const parsed = parseStoredInterleavedContent(block.content);
    return parsed ? interleavedBlocksToPlainText(parsed) : block.content;
}

function getCreativeBlockMediaPool(pitch: StoredPitch, promptTags: string[]) {
    const mediaPool: Array<{ mediaUrl: string; altText: string }> = [];

    for (const block of pitch.blocks) {
        if (!block.prompt || !promptTags.some((tag) => block.prompt === tag || block.prompt.startsWith(`${tag}:`))) {
            continue;
        }

        if (block.type === "image" && block.mediaUrl && !isFallbackVisual(block.mediaUrl)) {
            mediaPool.push({
                mediaUrl: block.mediaUrl,
                altText: block.altText || block.prompt || pitch.title,
            });
        }

        const parsed = parseStoredInterleavedContent(block.content);
        if (!parsed) {
            continue;
        }

        for (const item of parsed) {
            if (item.type === "image" && item.mediaUrl && !isFallbackVisual(item.mediaUrl)) {
                mediaPool.push({
                    mediaUrl: item.mediaUrl,
                    altText: item.prompt || item.caption || pitch.title,
                });
            }

            if (item.type === "storyboard") {
                for (const scene of item.scenes) {
                    if (scene.mediaUrl && !isFallbackVisual(scene.mediaUrl)) {
                        mediaPool.push({
                            mediaUrl: scene.mediaUrl,
                            altText: scene.caption || scene.imagePrompt || pitch.title,
                        });
                    }
                }
            }
        }
    }

    return mediaPool.filter((entry, index, list) => list.findIndex((candidate) => candidate.mediaUrl === entry.mediaUrl) === index);
}

function buildTrailerVideoPrompt(pitch: StoredPitch, basePrompt?: string) {
    const context = summarizePitchContext(pitch);
    const trailerPlan = getCreativeBlockContent(pitch, "creative:trailer");
    const direction = plainTextSnippet(basePrompt || trailerPlan || context.narrative, 650);

    return [
        `Create a premium cinematic teaser trailer for the video game "${context.title}".`,
        `Game direction: ${plainTextSnippet(context.narrative, 280)}.`,
        direction ? `Trailer plan and shot direction: ${direction}.` : "",
        "Visual priorities: opening atmosphere, world reveal, protagonist reveal, gameplay action, rising conflict, epic closing beat.",
        "Style: AAA game trailer, Unreal Engine 5 quality, dramatic lighting, immersive camera movement, premium marketing cinematography, strong sense of scale.",
        "Format: 16:9 landscape, no on-screen text, no subtitles, no watermark, no logos.",
    ]
        .filter(Boolean)
        .join(" ");
}

function normalizeVideoUrl(uri: string | null | undefined) {
    if (!uri) {
        return null;
    }

    if (uri.startsWith("gs://")) {
        const pathWithoutScheme = uri.slice(5);
        const slashIndex = pathWithoutScheme.indexOf("/");

        if (slashIndex === -1) {
            return null;
        }

        const bucket = pathWithoutScheme.slice(0, slashIndex);
        const objectPath = pathWithoutScheme.slice(slashIndex + 1).split("/").map(encodeURIComponent).join("/");
        return `https://storage.googleapis.com/${bucket}/${objectPath}`;
    }

    return uri;
}

function plainTextSnippet(text: string, maxLength: number = 140) {
    return text
        .replace(/#{1,6}\s*/g, "")
        .replace(/[*_`>-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength)
        .trim();
}

function makeVisualPrompt(title: string, subject: string, sourceText: string, extras: string[] = []) {
    const snippet = plainTextSnippet(sourceText, 120);
    return [
        title,
        subject,
        ...extras,
        snippet ? `inspired by ${snippet}` : "",
        "cinematic game concept art",
    ]
        .filter(Boolean)
        .join(", ");
}

function simplifyImagePrompt(prompt: string) {
    return prompt
        .replace(/\s+/g, " ")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 6)
        .join(", ");
}

function buildPitchVisualBlocks(input: PitchInput, text: string): InterleavedContentBlock[] {
    return [
        { type: "text", content: text },
        {
            type: "image",
            prompt: makeVisualPrompt(input.title, "key concept art", text, [input.genre, input.tone.join(", ")]),
            caption: "Concept Art",
        },
    ];
}

function buildCreativeVisualBlocks(
    pitch: StoredPitch,
    feature: Exclude<CreativeFeature, "refine" | "trailerVideo">,
    text: string,
): InterleavedContentBlock[] {
    const context = summarizePitchContext(pitch);

    if (feature === "character") {
        return [
            { type: "text", content: text },
            {
                type: "image",
                prompt: makeVisualPrompt(context.title, "main protagonist concept art", text, ["cinematic character design"]),
                caption: "Character Concept",
            },
        ];
    }

    if (feature === "gameplay") {
        const steps = extractGameplayLoopSteps(text);

        return [
            { type: "text", content: text },
            {
                type: "image",
                prompt: makeVisualPrompt(context.title, "gameplay key art", text, ["action sequence", "mechanic showcase"]),
                caption: "Gameplay Visual",
            },
            {
                type: "diagram" as const,
                steps: steps.length > 1 ? steps : fallbackGameplayDiagramSteps(context.title),
            },
        ];
    }

    if (feature === "world") {
        return [
            { type: "text", content: text },
            {
                type: "image",
                prompt: makeVisualPrompt(context.title, "world concept art", text, ["environment key art"]),
                caption: "World Concept",
            },
        ];
    }

    if (feature === "universe") {
        return [
            { type: "text", content: text },
            {
                type: "image",
                prompt: makeVisualPrompt(context.title, "world bible concept art", text, ["key locations", "factions"]),
                caption: "Universe World Art",
            },
            {
                type: "image",
                prompt: makeVisualPrompt(context.title, "franchise hero concept art", text),
                caption: "Universe Character Art",
            },
        ];
    }

    if (feature === "trailer") {
        return [
            { type: "text", content: text },
            {
                type: "storyboard",
                scenes: [
                    {
                        imagePrompt: makeVisualPrompt(context.title, "opening atmosphere", text, ["AAA cinematic trailer frame"]),
                        caption: "Opening atmosphere",
                    },
                    {
                        imagePrompt: makeVisualPrompt(context.title, "main character reveal", text, ["AAA cinematic trailer frame"]),
                        caption: "Main character reveal",
                    },
                    {
                        imagePrompt: makeVisualPrompt(context.title, "epic climax", text, ["AAA cinematic trailer frame"]),
                        caption: "Epic moment",
                    },
                ],
            },
        ];
    }

    if (feature === "market") {
        return [
            { type: "text", content: text },
            {
                type: "image",
                prompt: makeVisualPrompt(context.title, "market positioning board", text, ["audience moodboard"]),
                caption: "Market Positioning Visual",
            },
        ];
    }

    if (feature === "audio") {
        return [
            { type: "text", content: text },
            {
                type: "image",
                prompt: makeVisualPrompt(context.title, "audio moodboard", text, ["soundtrack direction", "sonic atmosphere"]),
                caption: "Audio Moodboard",
            },
        ];
    }

    return [{ type: "text", content: text }];
}

function fallbackGameplayDiagramSteps(title: string) {
    return [
        `Explore ${title}'s active zone`,
        "Spot a hostile target or strategic opportunity",
        "Fight or outmaneuver the encounter",
        "Convert the win into power, allies, or upgrades",
        "Push the rebellion into the next objective",
    ];
}

function validateCreativeBlocks(
    pitch: StoredPitch,
    feature: Exclude<CreativeFeature, "refine" | "trailerVideo">,
    blocks: InterleavedContentBlock[],
) {
    const hasText = blocks.some((block) => block.type === "text" && block.content.trim());
    const hasImage = blocks.some((block) => block.type === "image");
    const hasStoryboard = blocks.some((block) => block.type === "storyboard");
    const hasDiagram = blocks.some((block) => block.type === "diagram" && block.steps.length > 1);

    if (!hasText) {
        return feature === "trailer" ? fallbackTrailerBlocks(pitch)
            : feature === "character" ? fallbackCharacterBlocks(pitch)
            : feature === "gameplay" ? fallbackGameplayBlocks(pitch)
            : feature === "world" ? fallbackWorldBlocks(pitch)
            : feature === "universe" ? fallbackUniverseBlocks(pitch)
            : feature === "market" ? fallbackMarketBlocks(pitch)
            : fallbackAudioBlocks(pitch);
    }

    if (feature === "gameplay" && !hasDiagram) {
        return [
            ...blocks,
            { type: "diagram", steps: fallbackGameplayDiagramSteps(pitch.title) },
        ];
    }

    if (feature === "trailer" && !hasStoryboard) {
        return fallbackTrailerBlocks(pitch);
    }

    if ((feature === "character" || feature === "world" || feature === "market" || feature === "audio") && !hasImage) {
        return buildCreativeVisualBlocks(pitch, feature, interleavedBlocksToPlainText(blocks));
    }

    return blocks;
}

function extractGameplayLoopSteps(text: string) {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const normalizeStep = (line: string) =>
        line.replace(/^[-*]\s*/, "").replace(/^\d+[\).\s-]*/, "").trim();

    const isHeading = (line: string) =>
        /^#{1,6}\s/.test(line) ||
        /^\d+\.\s+[A-Z]/.test(line) ||
        /^(Core Gameplay Loop|Gameplay Loop|Player Actions|Controls and Mechanics|Progression System|Challenges and Enemies|Rewards System|Multiplayer or Single Player Design)$/i.test(line);

    const loopIndex = lines.findIndex((line) =>
        /core gameplay loop|gameplay loop/i.test(line),
    );

    if (loopIndex >= 0) {
        const steps: string[] = [];

        for (let index = loopIndex + 1; index < lines.length; index += 1) {
            const line = lines[index];

            if (steps.length > 0 && isHeading(line)) {
                break;
            }

            const normalized = normalizeStep(line);
            if (normalized) {
                steps.push(normalized);
            }
        }

        if (steps.length > 1) {
            return steps.slice(0, 6);
        }
    }

    const bulletSteps = lines
        .filter((line) => /^[-*]\s+/.test(line) || /^\d+[\).\s-]/.test(line))
        .map(normalizeStep)
        .filter(Boolean);

    return bulletSteps.slice(0, 6);
}

function cleanGeneratedText(text: string) {
    return text
        .replace(/^As a [^\n]+?:\s*/i, "")
        .replace(/^Here(?:'|’)s [^\n]+?:\s*/i, "")
        .replace(/^\s*---+\s*$/gm, "")
        .replace(/^\*\*(\d+\.?\s+.+?)\*\*$/gm, "## $1")
        .replace(/^\*\*(.+?)\*\*$/gm, "### $1")
        .replace(/^#{1,6}\s*\*+\s*(.+?)\*+\s*$/gm, "### $1")
        .replace(/^#{1,6}\s*(\d+\.?\s+.+)$/gm, "## $1")
        .replace(/^#{1,6}\s*(.+)$/gm, "### $1")
        .replace(/^\s*[-*]\s+\*\*(.+?)\*\*\s*:?\s*$/gm, "* $1")
        .replace(/^(\s*[-*]\s+)\*\*(.+?)\*\*:/gm, "$1$2:")
        .replace(/^(\s*[-*]\s+)\*\*(.+?)\*\*/gm, "$1$2")
        .replace(/^\*\*(.+?)\*\*:\s*/gm, "$1: ")
        .replace(/\*\*([^*\n]{1,80})\*\*/g, "$1")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function extractJson<T>(text: string): T {
    const trimmed = text.trim();
    const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1] ?? trimmed;
    return JSON.parse(candidate) as T;
}

function makeBlock(type: BlockType, order: number, partial: Partial<Block>): Block {
    return {
        blockId: randomUUID(),
        type,
        status: "complete",
        content: null,
        mediaUrl: null,
        altText: null,
        transcript: null,
        prompt: null,
        order,
        error: null,
        ...partial,
    };
}

function fallbackNarrative(input: PitchInput): InterleavedContentBlock[] {
    return [
        {
            type: "text",
            content: `${input.title} is a ${input.tone[0]?.toLowerCase() ?? "stylized"} ${input.genre.toLowerCase()} built around ${input.mechanic.toLowerCase()}. It is designed for ${input.audience} across ${input.platform.join(", ")}.`,
        },
        {
            type: "image",
            prompt: `cinematic concept art for ${input.title}, ${input.genre}, ${input.tone.join(", ")}, key environment reveal`,
            caption: "Concept Art",
        },
        {
            type: "text",
            content: `The gameplay fantasy centers on ${input.mechanic.toLowerCase()} while delivering a ${input.tone.join(", ").toLowerCase()} tone that reads clearly in trailers and publisher decks.`,
        },
        {
            type: "diagram",
            steps: [
                "Explore the world and discover a disturbance",
                "Investigate the anomaly using the core mechanic",
                "Defeat the escalation encounter",
                "Restore order and unlock the next threat",
            ],
        },
        {
            type: "storyboard",
            scenes: [
                {
                    imagePrompt: `${input.title} opening shot, wide cinematic reveal, ${input.tone.join(", ")}`,
                    caption: "The world is introduced with an unforgettable mood shot.",
                },
                {
                    imagePrompt: `${input.title} action reveal, protagonist using ${input.mechanic}, dramatic lighting`,
                    caption: "The core mechanic becomes the emotional centerpiece of the trailer.",
                },
            ],
        },
    ];
}

function svgDataUri(title: string, sectionLabel?: string) {
    const label = escapeXml(sectionLabel || "Concept visual");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="#0b1020"/>
<stop offset="55%" stop-color="#1f2937"/>
<stop offset="100%" stop-color="#ff4f87"/>
</linearGradient>
<linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="rgba(255,255,255,0.10)"/>
<stop offset="100%" stop-color="rgba(255,255,255,0.02)"/>
</linearGradient>
</defs>
<rect width="1600" height="900" fill="url(#bg)"/>
<circle cx="1270" cy="180" r="180" fill="rgba(255,255,255,0.08)"/>
<circle cx="280" cy="700" r="220" fill="rgba(255,255,255,0.06)"/>
<rect x="110" y="245" width="1380" height="420" rx="34" fill="url(#panel)" stroke="rgba(255,255,255,0.14)"/>
<text x="120" y="170" fill="#ffffff" font-size="72" font-family="Arial, sans-serif" font-weight="700">${escapeXml(title)}</text>
<text x="150" y="325" fill="#f8fafc" font-size="28" font-family="Arial, sans-serif" letter-spacing="8">${label.toUpperCase()}</text>
<text x="150" y="410" fill="#ffffff" font-size="52" font-family="Arial, sans-serif" font-weight="700">PitchForge deck preview</text>
<foreignObject x="150" y="455" width="1240" height="150">
  <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; color: rgba(255,255,255,0.88); font-size: 32px; line-height: 1.45;">
    Visual generation missed this frame, so PitchForge created a polished investor-safe placeholder instead of leaving the section blank.
  </div>
</foreignObject>
</svg>`;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function isFallbackVisual(url: string | null | undefined) {
    return !!url && url.startsWith("data:image/svg+xml;base64,");
}

function pickReusableVisual(candidates: Array<string | null | undefined>) {
    return candidates.find((candidate) => candidate && !isFallbackVisual(candidate)) ?? null;
}

function diversifyConceptArtBlocks(
    pitch: StoredPitch,
    blocks: InterleavedContentBlock[],
) {
    const externalPool = getCreativeBlockMediaPool(pitch, [
        "creative:character",
        "creative:world",
        "creative:trailer",
        "creative:gameplay",
        "creative:market",
        "creative:audio",
    ]);
    const usedUrls = new Set<string>();
    let poolIndex = 0;

    return blocks.map((block) => {
        if (block.type !== "image") {
            return block;
        }

        const currentUrl = block.mediaUrl ?? null;
        const shouldReplace = !currentUrl || isFallbackVisual(currentUrl) || usedUrls.has(currentUrl);

        if (!shouldReplace) {
            usedUrls.add(currentUrl);
            return block;
        }

        while (poolIndex < externalPool.length && usedUrls.has(externalPool[poolIndex].mediaUrl)) {
            poolIndex += 1;
        }

        const replacement = poolIndex < externalPool.length ? externalPool[poolIndex] : null;

        if (!replacement) {
            if (currentUrl) {
                usedUrls.add(currentUrl);
            }
            return block;
        }

        usedUrls.add(replacement.mediaUrl);
        poolIndex += 1;

        return {
            ...block,
            mediaUrl: replacement.mediaUrl,
        } satisfies InterleavedContentBlock;
    });
}

function escapeXml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

async function resolveInterleavedMedia(title: string, blocks: InterleavedContentBlock[]) {
    const resolvedBlocks: InterleavedContentBlock[] = [];

    for (const block of blocks) {
        if (block.type === "image") {
            const image = await generateImageWithModel(title, block.prompt).catch((error) => {
                console.error("Interleaved image generation failed, using fallback image.", error);
                return {
                    mediaUrl: svgDataUri(title, block.caption ?? "Concept Art"),
                    altText: block.prompt,
                };
            });

            resolvedBlocks.push({
                ...block,
                mediaUrl: image.mediaUrl,
            } satisfies InterleavedContentBlock);
            continue;
        }

        if (block.type === "storyboard") {
            const scenes = [];

            for (const scene of block.scenes) {
                const image = await generateImageWithModel(title, scene.imagePrompt).catch((error) => {
                    console.error("Storyboard scene generation failed, using fallback image.", error);
                    return {
                        mediaUrl: svgDataUri(title, scene.caption),
                        altText: scene.imagePrompt,
                    };
                });

                scenes.push({
                    ...scene,
                    mediaUrl: image.mediaUrl,
                });
            }

            resolvedBlocks.push({
                ...block,
                scenes,
            } satisfies InterleavedContentBlock);
            continue;
        }

        resolvedBlocks.push(block);
    }

    const successfulVisuals = resolvedBlocks.flatMap((block) => {
        if (block.type === "image") {
            return block.mediaUrl && !isFallbackVisual(block.mediaUrl) ? [block.mediaUrl] : [];
        }

        if (block.type === "storyboard") {
            return block.scenes
                .map((scene) => scene.mediaUrl)
                .filter((mediaUrl): mediaUrl is string => !!mediaUrl && !isFallbackVisual(mediaUrl));
        }

        return [];
    });

    const reusableVisual = pickReusableVisual(successfulVisuals);

    if (!reusableVisual) {
        return resolvedBlocks;
    }

    return resolvedBlocks.map((block) => {
        if (block.type === "image" && isFallbackVisual(block.mediaUrl)) {
            return {
                ...block,
                mediaUrl: reusableVisual,
            } satisfies InterleavedContentBlock;
        }

        if (block.type === "storyboard") {
            return {
                ...block,
                scenes: block.scenes.map((scene) => ({
                    ...scene,
                    mediaUrl: isFallbackVisual(scene.mediaUrl) ? reusableVisual : scene.mediaUrl,
                })),
            } satisfies InterleavedContentBlock;
        }

        return block;
    });
}

async function generateInterleavedNarrativeWithModel(input: PitchInput) {
    const ai = getClient();
    const fallback = fallbackNarrative(input);

    if (!ai) {
        const resolved = await resolveInterleavedMedia(input.title, fallback);
        return serializeInterleavedBlocks(resolved);
    }

    const model = getPitchModel();
    const response = await ai.models.generateContent({
        model,
        contents: [
            "You are a professional game startup pitch writer.",
            "Transform the user idea into a clear and compelling game pitch.",
            "",
            "USER IDEA:",
            serializeInput(input),
            "",
            "Generate exactly these sections:",
            "1. Game Title",
            "2. One Line Hook",
            "3. Core Concept (3-4 sentences)",
            "4. Unique Selling Point",
            "5. Target Platform (PC / Console / Mobile / VR)",
            "6. Target Audience",
            "7. Genre",
            "8. Why This Game Will Succeed",
            "9. Tone",
            "10. Tagline",
            "",
            "Rules:",
            "- Keep it concise",
            "- Avoid generic explanations",
            "- Focus on originality and market appeal",
            "- Return polished pitch copy suitable for a startup deck",
            "- Do not mention that you are an AI, analyst, writer, or designer",
            "- Do not write introductions like 'Here is the analysis' or 'I've reviewed the concept'",
            "- Use this exact format:",
            "Title",
            "<title>",
            "",
            "Genre",
            "<genre>",
            "",
            "Core Mechanic",
            "<2 short lines>",
            "",
            "Game Concept",
            "<2-3 short paragraphs>",
            "",
            "Gameplay Loop",
            "<5 bullet points>",
            "",
            "Unique Hook",
            "<short paragraph>",
            "",
            "Tone",
            "<3 tone words separated by bullets or commas>",
            "",
            "Tagline",
            "<one line>",
        ].join("\n"),
        config: {
            temperature: 0.7,
        },
    });

    const text = cleanGeneratedText(response.text?.trim() || "");
    if (text) {
        const resolved = await resolveInterleavedMedia(input.title, buildPitchVisualBlocks(input, text));
        return serializeInterleavedBlocks(resolved);
    }

    const resolved = await resolveInterleavedMedia(input.title, fallback);
    return serializeInterleavedBlocks(resolved);
}

type CreativeFeature = "concept" | "trailer" | "trailerVideo" | "character" | "gameplay" | "world" | "market" | "audio" | "universe" | "refine";

async function generateConceptArtBlocks(pitch: StoredPitch) {
    const context = summarizePitchContext(pitch);
    const blocks: InterleavedContentBlock[] = [
        {
            type: "text",
            content: `## Concept Art\n\nAn investor-ready visual suite translating ${context.title} into the key images a startup pitch deck needs: hero, world, action, enemy, and flagship key art.`,
        },
        {
            type: "image",
            prompt: [
                "Create AAA video game character concept art.",
                makeVisualPrompt(context.title, "main protagonist full body concept", context.narrative, [
                    "detailed outfit and armor",
                    "weapon or special gear",
                    "cinematic lighting",
                    "Unreal Engine 5 quality",
                    "neutral background",
                ]),
            ].join(" "),
            caption: "Character Concept",
        },
        {
            type: "image",
            prompt: [
                "Create AAA video game environment concept art.",
                makeVisualPrompt(context.title, "large cinematic environment", context.narrative, [
                    "epic landscape",
                    "dramatic lighting",
                    "ultra detailed environment",
                    "wide cinematic shot",
                    "strong atmosphere",
                ]),
            ].join(" "),
            caption: "Environment Concept",
        },
        {
            type: "image",
            prompt: [
                "Create AAA cinematic video game action scene concept art.",
                makeVisualPrompt(context.title, "dynamic action moment", context.narrative, [
                    "main character in action",
                    "enemies or challenge",
                    "dramatic camera angle",
                    "motion and energy",
                    "promotional game poster",
                ]),
            ].join(" "),
            caption: "Action Scene Concept",
        },
        {
            type: "image",
            prompt: [
                "Create AAA video game enemy concept art.",
                makeVisualPrompt(context.title, "primary enemy or boss design", context.narrative, [
                    "threatening silhouette",
                    "signature power or mutation",
                    "high detail creature or armored foe",
                    "studio concept sheet style",
                ]),
            ].join(" "),
            caption: "Enemy / Boss Concept",
        },
        {
            type: "image",
            prompt: [
                "Create AAA video game key art poster.",
                makeVisualPrompt(context.title, "flagship promotional key art", context.narrative, [
                    "hero plus world backdrop",
                    "premium box art composition",
                    "dramatic marketing image",
                    "investor-ready game poster",
                ]),
            ].join(" "),
            caption: "Flagship Key Art",
        },
    ];

    const resolved = await resolveInterleavedMedia(pitch.title, blocks);
    const diversified = diversifyConceptArtBlocks(pitch, resolved);
    return serializeInterleavedBlocks(diversified);
}

function fallbackTrailerBlocks(pitch: StoredPitch): InterleavedContentBlock[] {
    const context = summarizePitchContext(pitch);
    return [
        {
            type: "text",
            content: `Trailer storyboard for ${context.title}: a cinematic reveal built around the latest pitch direction and its strongest dramatic hooks.`,
        },
        {
            type: "storyboard",
            scenes: [
                {
                    imagePrompt: `${context.title} opening atmosphere, cinematic establishing shot inspired by: ${context.narrative.slice(0, 220)}`,
                    caption: "The world breaks open under a dying sky.",
                },
                {
                    imagePrompt: `${context.title} main character reveal, dramatic silhouette, inspired by: ${context.narrative.slice(0, 220)}`,
                    caption: "The protagonist enters the impossible.",
                },
                {
                    imagePrompt: `${context.title} epic climax, final showdown, cinematic trailer frame based on: ${context.narrative.slice(0, 220)}`,
                    caption: "Power collides with fate in the closing beat.",
                },
            ],
        },
        {
            type: "text",
            content: `"When time breaks... only echoes remain."`,
        },
    ];
}

function fallbackCharacterBlocks(pitch: StoredPitch): InterleavedContentBlock[] {
    const context = summarizePitchContext(pitch);
    return [
        {
            type: "text",
            content: `Main character direction for ${context.title}\nRole: Lead protagonist shaped by the current pitch narrative\nSpecialty: A signature power that embodies the game's central fantasy\nVisual Hook: A silhouette and costume language rooted in the latest pitch direction`,
        },
        {
            type: "image",
            prompt: `${context.title} protagonist concept art, hero pose, inspired by: ${context.narrative.slice(0, 220)}`,
            caption: "Character Concept",
        },
        {
            type: "text",
            content: `This character should embody the fantasy, tone, and stakes established in the latest version of ${context.title}.`,
        },
    ];
}

function fallbackGameplayBlocks(pitch: StoredPitch): InterleavedContentBlock[] {
    const context = summarizePitchContext(pitch);
    return [
        {
            type: "text",
            content: `${context.title} should turn the current pitch fantasy into a readable player loop that is easy for players, publishers, and creators to understand instantly.`,
        },
        {
            type: "diagram",
            steps: [
                "Explore the current zone",
                "Detect a major anomaly or opportunity",
                "Engage the core encounter",
                "Earn a power spike or artifact",
                "Push into the next run with new leverage",
            ],
        },
    ];
}

function fallbackWorldBlocks(pitch: StoredPitch): InterleavedContentBlock[] {
    const context = summarizePitchContext(pitch);
    return [
        {
            type: "text",
            content: `World direction for ${context.title}\nSetting: Built from the latest pitch narrative\nKey Locations: Landmarks that reinforce the game's central fantasy\nLore: A concise backstory that supports the current tone and stakes`,
        },
        {
            type: "image",
            prompt: `${context.title} world concept art, key locations and factions inspired by: ${context.narrative.slice(0, 220)}`,
            caption: "World Builder",
        },
    ];
}

function fallbackMarketBlocks(pitch: StoredPitch): InterleavedContentBlock[] {
    const context = summarizePitchContext(pitch);
    return [
        {
            type: "text",
            content: `Market read for ${context.title}\nComparable Games: Titles with adjacent audience appeal\nPositioning: The latest pitch direction should emphasize a distinct hook and memorable visual identity\nMonetization: Premium launch with expansion potential and standout creative packaging`,
        },
    ];
}

function fallbackAudioBlocks(pitch: StoredPitch): InterleavedContentBlock[] {
    const context = summarizePitchContext(pitch);
    return [
        {
            type: "text",
            content: `Audio direction for ${context.title}\nMusic Style: Match the emotional arc of the latest pitch\nSound Design: Reinforce the game's signature fantasy and world texture\nVoice Direction: Support the tone, pace, and dramatic stakes of the current concept`,
        },
    ];
}

function fallbackUniverseBlocks(pitch: StoredPitch): InterleavedContentBlock[] {
    return [
        ...fallbackWorldBlocks(pitch),
        ...fallbackCharacterBlocks(pitch),
        ...fallbackGameplayBlocks(pitch),
    ];
}

function getPrimaryNarrativeText(pitch: StoredPitch) {
    const narrativeBlock = pitch.blocks.find((block) => block.type === "text");

    if (!narrativeBlock?.content) {
        return `${pitch.title} is a ${pitch.input.genre} with a core mechanic built around ${pitch.input.mechanic}.`;
    }

    const parsed = parseStoredInterleavedContent(narrativeBlock.content);
    return parsed ? interleavedBlocksToPlainText(parsed) : narrativeBlock.content;
}

async function generateCreativeBlocksWithModel(
    pitch: StoredPitch,
    feature: Exclude<CreativeFeature, "refine" | "concept" | "trailerVideo">,
) {
    const ai = getClient();

    const fallback =
        feature === "trailer" ? fallbackTrailerBlocks(pitch) :
            feature === "character" ? fallbackCharacterBlocks(pitch) :
                feature === "gameplay" ? fallbackGameplayBlocks(pitch) :
                    feature === "world" ? fallbackWorldBlocks(pitch) :
                        feature === "universe" ? fallbackUniverseBlocks(pitch) :
                        feature === "market" ? fallbackMarketBlocks(pitch) :
                            fallbackAudioBlocks(pitch);

    if (!ai) {
        const resolved = await resolveInterleavedMedia(pitch.title, fallback);
        return serializeInterleavedBlocks(resolved);
    }

    const context = summarizePitchContext(pitch);
    const prompt =
        feature === "trailer"
            ? [
                "Create a cinematic video trailer plan for the following video game concept.",
                "",
                "GAME IDEA:",
                context.summary,
                "",
                "Output format:",
                "Trailer Length: 45 seconds",
                "Scene 1 - Opening atmosphere",
                "Scene 2 - Introduction of world",
                "Scene 3 - Main character reveal",
                "Scene 4 - Gameplay action sequence",
                "Scene 5 - Conflict or challenge",
                "Scene 6 - Epic moment",
                "Scene 7 - Title reveal",
                "",
                "Include:",
                "- visual description",
                "- camera movement",
                "- mood",
                "- environment",
                "",
                "Style:",
                "AAA cinematic trailer",
                "Unreal Engine quality",
                "dramatic and immersive",
                "",
                "Return only the trailer plan. Do not add meta commentary or self-introduction.",
                ].join("\n\n")
                : feature === "character"
                ? [
                    "You are a professional game character designer.",
                    "",
                    "Based on the game concept below, generate the main characters.",
                    "",
                    "GAME IDEA:",
                    context.summary,
                    "",
                    "Generate:",
                    "1. Main Protagonist",
                    "- name",
                    "- role",
                    "- personality",
                    "- special ability",
                    "- appearance",
                    "",
                    "2. Main Antagonist",
                    "- name",
                    "- motivation",
                    "- powers",
                    "- visual design",
                    "",
                    "3. Supporting Characters (2-3)",
                    "- role",
                    "- unique traits",
                    "",
                    "Keep descriptions vivid but concise.",
                    "Return only the character output. Do not explain your process.",
                    "Use clean sections and bullets only. No intro paragraph.",
                ].join("\n\n")
                : feature === "gameplay"
                ? [
                    "You are a senior game designer.",
                    "",
                    "Explain the gameplay mechanics of the following game idea.",
                    "",
                    "GAME IDEA:",
                    context.summary,
                    "",
                    "Generate:",
                    "1. Core Gameplay Loop",
                    "2. Player Actions",
                    "3. Controls and Mechanics",
                    "4. Progression System",
                    "5. Challenges and Enemies",
                    "6. Rewards System",
                    "7. Multiplayer or Single Player Design",
                    "",
                    "Focus on engaging gameplay mechanics.",
                    "Avoid vague descriptions.",
                    "Return clean sectioned output only.",
                    "Use short sections and bullet points where useful.",
                ].join("\n\n")
                : feature === "world"
                ? [
                    "You are a professional world builder for video games.",
                    "",
                    "Create the game world based on the concept below.",
                    "",
                    "GAME IDEA:",
                    context.summary,
                    "",
                    "Generate:",
                    "1. World Setting",
                    "2. Environment Types",
                    "3. Lore and Backstory",
                    "4. Key Locations",
                    "5. Atmosphere and Mood",
                    "6. Visual Style",
                    "",
                    "Make the world immersive and unique.",
                    "Return only the world-building content.",
                    "Use short sections and avoid long intro paragraphs.",
                ].join("\n\n")
                : feature === "universe"
                ? [
                    "You are a franchise creative director building a complete game universe snapshot.",
                    "",
                    "GAME IDEA:",
                    context.summary,
                    "",
                    "Create a cohesive mini universe guide with:",
                    "1. World Setting",
                    "2. Factions",
                    "3. Key Locations",
                    "4. Main Protagonist",
                    "5. Main Antagonist",
                    "6. Enemies and Bosses",
                    "7. Gameplay Fantasy",
                    "8. Why this universe can grow into a franchise",
                    "",
                    "Keep it vivid, concise, and presentation ready.",
                    "Return only the final universe guide.",
                ].join("\n\n")
                : feature === "market"
                ? [
                    "You are a gaming industry analyst.",
                    "",
                    "Analyze the market potential of the following game concept.",
                    "",
                    "GAME IDEA:",
                    context.summary,
                    "",
                    "Generate:",
                    "1. Target Player Demographic",
                    "2. Comparable Popular Games",
                    "3. Market Trend Fit",
                    "4. Monetization Model",
                    "5. Estimated Market Appeal",
                    "6. Why Investors Would Care",
                    "",
                    "Keep it realistic and data-driven.",
                    "Do not say 'as an analyst' or add introductory filler.",
                    "Return a clean industry-report style output.",
                ].join("\n\n")
                : [
                    "You are a professional game audio director.",
                    "",
                    "Create the audio design plan for the following game.",
                    "",
                    "GAME IDEA:",
                    context.summary,
                    "",
                    "Generate:",
                    "1. Background Music Style",
                    "2. Combat or Action Music",
                    "3. Ambient Sounds",
                    "4. Character Voice Style",
                    "5. Sound Effects Design",
                    "6. Trailer Voiceover Script (20-30 seconds)",
                    "",
                    "Make the audio cinematic and immersive.",
                    "Return only the audio plan content.",
                ].join("\n\n");

    const model = getPitchModel();

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            temperature: feature === "market" ? 0.5 : 0.7,
        },
    }).catch(async (error) => {
        if (feature !== "trailer") {
            throw error;
        }

        console.warn("Trailer model failed, falling back to Gemini text model.", error);
        return ai.models.generateContent({
            model: getPitchModel(),
            contents: prompt,
            config: {
                temperature: 0.7,
            },
        });
    });

    const text = cleanGeneratedText(response.text?.trim() || "");
    if (text) {
        const verifiedBlocks = validateCreativeBlocks(pitch, feature, buildCreativeVisualBlocks(pitch, feature, text));
        const resolved = await resolveInterleavedMedia(pitch.title, verifiedBlocks);
        return serializeInterleavedBlocks(resolved);
    }

    const resolved = await resolveInterleavedMedia(pitch.title, fallback);
    return serializeInterleavedBlocks(resolved);
}

async function refineNarrativeWithModel(pitch: StoredPitch, instruction: string) {
    const ai = getClient();
    const baseNarrative = getPrimaryNarrativeText(pitch);

    if (!ai) {
        return serializeInterleavedBlocks([
            {
                type: "text",
                content: `${baseNarrative}\n\nRefinement note applied: ${instruction}`,
            },
        ]);
    }

    const model = getPitchModel();
    const response = await ai.models.generateContent({
        model,
        contents: [
            "You are an AI creative director refining an existing game pitch.",
            "Revise the pitch using the user instruction.",
            "Keep the result cinematic, concise, and presentation-ready.",
            "Return only the improved pitch content with no commentary about what changed.",
            `User instruction: ${instruction}`,
            `Current pitch:\n${baseNarrative}`,
            `Current title: ${pitch.title}`,
        ].join("\n\n"),
        config: {
            temperature: 0.7,
        },
    });

    const text = cleanGeneratedText(response.text?.trim() || "");
    if (text) {
        return serializeInterleavedBlocks([
            {
                type: "text",
                content: text,
            },
        ]);
    }

    const resolved = await resolveInterleavedMedia(pitch.title, [
        {
            type: "text",
            content: `${baseNarrative}\n\nRefinement direction: ${instruction}`,
        },
    ]);
    return serializeInterleavedBlocks(resolved);
}

async function generateTableForPitch(pitch: StoredPitch) {
    const ai = getClient();
    const context = summarizePitchContext(pitch);

    if (!ai) {
        return `| Pillar | Details |
| --- | --- |
| Title | ${context.title} |
| Core Pitch | ${context.narrative.slice(0, 180)} |
| Commercial Hook | Clear fantasy, readable value proposition, and expandable franchise potential. |`;
    }

    const model = getPitchModel();
    const response = await ai.models.generateContent({
        model,
        contents: `Return only a Markdown table summarizing this game pitch for a deck slide.\n\n${context.summary}`,
        config: {
            temperature: 0.4,
        },
    });

    return response.text?.trim() || `| Pillar | Details |
| --- | --- |
| Title | ${context.title} |
| Core Pitch | ${context.narrative.slice(0, 180)} |
| Commercial Hook | Clear fantasy, readable value proposition, and expandable franchise potential. |`;
}

async function generateImageWithModel(title: string, prompt: string) {
    const ai = getClient();

    if (!ai) {
        return {
            mediaUrl: svgDataUri(title, prompt),
            altText: prompt,
        };
    }

    const model = getImageModel();
    const requestGeneratedImage = async (imagePrompt: string) => {
        try {
            const response = await ai.models.generateImages({
                model,
                prompt: imagePrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: "16:9",
                    includeRaiReason: true,
                    enhancePrompt: true,
                },
            });

            const generatedImage = response.generatedImages?.find((entry) => entry.image?.imageBytes || entry.image?.gcsUri)?.image;
            if (generatedImage?.imageBytes) {
                return {
                    bytes: generatedImage.imageBytes,
                    mimeType: generatedImage.mimeType ?? "image/png",
                };
            }

            const cloudUrl = normalizeVideoUrl(generatedImage?.gcsUri);
            if (cloudUrl) {
                return {
                    url: cloudUrl,
                    mimeType: generatedImage?.mimeType ?? "image/png",
                };
            }
        } catch (error) {
            console.warn("generateImages failed for prompt attempt, falling back to multimodal content generation.", error);
        }

        const response = await ai.models.generateContent({
            model,
            contents: `${imagePrompt}\n\nReturn an image only.`,
            config: {
                responseModalities: ["IMAGE"],
            },
        });

        const partWithImage = response.candidates
            ?.flatMap((candidate) => candidate.content?.parts ?? [])
            .find((part) => part.inlineData?.data);

        if (partWithImage?.inlineData?.data) {
            return {
                bytes: partWithImage.inlineData.data,
                mimeType: partWithImage.inlineData.mimeType ?? "image/png",
            };
        }

        return null;
    };

    const promptAttempts = [
        prompt,
        simplifyImagePrompt(prompt),
        `${title}, ${simplifyImagePrompt(prompt)}, premium video game concept art`,
        simplifyImagePrompt(`${title}, video game concept art, cinematic lighting, Unreal Engine 5 quality`),
        `${title}, AAA video game key art, cinematic lighting, detailed concept art`,
        `${title}, premium key art, hero subject, strong silhouette, dramatic lighting`,
    ].filter((attempt, index, list) => !!attempt && list.indexOf(attempt) === index);

    let resolvedImage: { bytes?: string; mimeType?: string; url?: string } | null = null;

    for (const attempt of promptAttempts) {
        resolvedImage = await requestGeneratedImage(attempt);

        if (resolvedImage?.bytes || resolvedImage?.url) {
            break;
        }
    }

    const bytes = resolvedImage?.bytes;
    const mimeType = resolvedImage?.mimeType ?? "image/png";
    const url = resolvedImage?.url ?? null;

    if (url) {
        return {
            mediaUrl: url,
            altText: prompt,
        };
    }

    if (!bytes) {
        return {
            mediaUrl: svgDataUri(title, plainTextSnippet(prompt, 30)),
            altText: prompt,
        };
    }

    return {
        mediaUrl: `data:${mimeType};base64,${bytes}`,
        altText: prompt,
    };
}

async function generateTrailerVideoAsset(pitch: StoredPitch, promptOverride?: string) {
    const ai = getClient();
    const trailerScript = getCreativeBlockContent(pitch, "creative:trailer") || fallbackTrailerBlocks(pitch)
        .map((block) => block.type === "text" ? block.content : "")
        .filter(Boolean)
        .join("\n\n");
    const prompt = promptOverride?.trim() || buildTrailerVideoPrompt(pitch);

    if (!ai) {
        return {
            mediaUrl: null,
            transcript: trailerScript,
            error: "Video generation needs Google Cloud Vertex AI credentials before PitchForge can render a trailer clip.",
            prompt,
        };
    }

    let operation = await ai.models.generateVideos({
        model: getVideoModel(),
        prompt,
        config: {
            numberOfVideos: 1,
            durationSeconds: 8,
            aspectRatio: "16:9",
            resolution: "720p",
            personGeneration: "allow_adult",
            enhancePrompt: true,
            generateAudio: false,
            negativePrompt: "low quality, text overlays, subtitles, logos, watermarks, UI, split screen",
        },
    });

    for (let attempt = 0; attempt < 36 && !operation.done; attempt += 1) {
        await wait(10000);
        operation = await ai.operations.getVideosOperation({ operation });
    }

    if (!operation.done) {
        return {
            mediaUrl: null,
            transcript: trailerScript,
            error: "Veo is still generating the trailer. Try again in a moment to refresh the clip.",
            prompt,
        };
    }

    if (operation.error) {
        return {
            mediaUrl: null,
            transcript: trailerScript,
            error: JSON.stringify(operation.error),
            prompt,
        };
    }

    const video = operation.response?.generatedVideos?.[0]?.video;
    const mediaUrl = video?.videoBytes
        ? `data:${video.mimeType || "video/mp4"};base64,${video.videoBytes}`
        : normalizeVideoUrl(video?.uri);

    return {
        mediaUrl,
        transcript: trailerScript,
        error: mediaUrl ? null : "Veo finished the job, but PitchForge could not find a playable trailer asset in the response.",
        prompt,
    };
}

export async function generatePitchBlocks(input: PitchInput): Promise<Block[]> {
    const narrative = await generateInterleavedNarrativeWithModel(input).catch((error) => {
        console.error("Gemini interleaved generation failed, using fallback narrative.", error);
        return resolveInterleavedMedia(input.title, fallbackNarrative(input))
            .then((resolved) => serializeInterleavedBlocks(resolved));
    });

    return [
        makeBlock("text", 0, { content: narrative, prompt: "creative:pitch" }),
    ];
}

interface RegenResponse {
    block: Block;
}

export async function regeneratePitchBlock(pitch: StoredPitch, block: Block, newPrompt?: string): Promise<RegenResponse> {
    if (block.type === "video") {
        const video = await generateTrailerVideoAsset(pitch, newPrompt?.trim() || block.prompt || undefined);

        return {
            block: {
                ...block,
                status: video.mediaUrl ? "complete" : "failed",
                mediaUrl: video.mediaUrl,
                transcript: video.transcript,
                prompt: newPrompt?.trim() || block.prompt,
                error: video.error,
            },
        };
    }

    if (block.type === "image") {
        const prompt = newPrompt?.trim() || block.prompt || `Hero image for ${pitch.title}`;
        const image = await generateImageWithModel(pitch.title, prompt).catch((error) => {
            console.error("Gemini image regeneration failed, using fallback image.", error);
            return {
                mediaUrl: svgDataUri(pitch.title, prompt),
                altText: prompt,
            };
        });

        return {
            block: {
                ...block,
                status: "complete",
                mediaUrl: image.mediaUrl,
                altText: image.altText,
                prompt,
                error: null,
            },
        };
    }

    if (block.type === "table" || block.type === "storyboard") {
        const content = await generateTableForPitch(pitch).catch((error) => {
            console.error("Gemini table regeneration failed, using fallback table.", error);
            return `| Pillar | Details |
| --- | --- |
| Title | ${pitch.title} |
| Core Pitch | ${getPrimaryNarrativeText(pitch).slice(0, 180)} |
| Commercial Hook | Clear fantasy, readable value proposition, and expandable franchise potential. |`;
        });

        return {
            block: {
                ...block,
                status: "complete",
                content,
                error: null,
            },
        };
    }

    const content = await generateInterleavedNarrativeWithModel({
        ...pitch.input,
        mechanic: newPrompt?.trim() || pitch.input.mechanic,
    }).catch((error) => {
        console.error("Gemini interleaved regeneration failed, using fallback narrative.", error);
        return resolveInterleavedMedia(pitch.title, fallbackNarrative(pitch.input))
            .then((resolved) => serializeInterleavedBlocks(resolved));
    });

    return {
        block: {
            ...block,
            status: "complete",
            content,
            error: null,
        },
    };
}

export async function generateCreativeFeature(
    pitch: StoredPitch,
    feature: CreativeFeature,
    instruction?: string,
) {
    if (feature === "refine") {
        const targetBlock = pitch.blocks.find((block) => block.type === "text") ?? makeBlock("text", 0, {});
        const content = await refineNarrativeWithModel(
            pitch,
            instruction?.trim() || "Make the world more cinematic and commercially sharp."
        );

        return {
            mode: "replace" as const,
            block: {
                ...targetBlock,
                type: "text" as const,
                status: "complete" as const,
                content,
                prompt: "creative:pitch",
                error: null,
            },
        };
    }

    if (feature === "trailerVideo") {
        const generated = await generateTrailerVideoAsset(pitch, instruction);
        const promptTag = "creative:trailer-video";
        const existingBlock = pitch.blocks.find((block) => block.prompt === promptTag);
        const nextBlock: Block = {
            ...(existingBlock ?? makeBlock("video", pitch.blocks.length, {})),
            type: "video",
            status: generated.mediaUrl ? "complete" : "failed",
            content: "Generated cinematic trailer clip",
            mediaUrl: generated.mediaUrl,
            altText: `${pitch.title} trailer clip`,
            transcript: generated.transcript,
            prompt: promptTag,
            error: generated.error,
        };

        return existingBlock
            ? {
                mode: "replace" as const,
                block: nextBlock,
            }
            : {
                mode: "append" as const,
                block: nextBlock,
            };
    }

    if (feature === "concept") {
        const content = await generateConceptArtBlocks(pitch);
        const promptTag = "creative:concept";
        const existingBlock = pitch.blocks.find((block) => block.prompt === promptTag);

        if (existingBlock) {
            return {
                mode: "replace" as const,
                block: {
                    ...existingBlock,
                    type: "text" as const,
                    status: "complete" as const,
                    content,
                    prompt: promptTag,
                    error: null,
                },
            };
        }

        return {
            mode: "append" as const,
            block: makeBlock("text", pitch.blocks.length, {
                content,
                prompt: promptTag,
            }),
        };
    }

    const content = await generateCreativeBlocksWithModel(pitch, feature);
    const promptTag = feature === "universe" ? "creative:world" : `creative:${feature}`;
    const existingBlock = pitch.blocks.find((block) => block.prompt === promptTag);

    if (existingBlock) {
        return {
            mode: "replace" as const,
            block: {
                ...existingBlock,
                type: "text" as const,
                status: "complete" as const,
                content,
                prompt: promptTag,
                error: null,
            },
        };
    }

    return {
        mode: "append" as const,
        block: makeBlock("text", pitch.blocks.length, {
            content,
            prompt: promptTag,
        }),
    };
}

interface StructuredResponse {
    title: string;
    summary: string;
}

export async function tryStructuredText(prompt: string): Promise<StructuredResponse | null> {
    const ai = getClient();

    if (!ai) {
        return null;
    }

    const model = safeModel(process.env.GEMINI_MODEL, "gemini-1.5-flash");
    const response = await ai.models.generateContent({
        model,
        contents: `${prompt}\n\nReturn JSON with keys "title" and "summary".`,
        config: {
            temperature: 0.3,
        },
    });

    const text = response.text?.trim();

    if (!text) {
        return null;
    }

    try {
        return extractJson<StructuredResponse>(text);
    } catch {
        return null;
    }
}
