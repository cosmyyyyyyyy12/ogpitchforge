export const INTERLEAVED_CONTENT_PREFIX = "PITCHFORGE_INTERLEAVED_V1:";

export type InterleavedContentBlock =
    | { type: "text"; content: string }
    | { type: "image"; prompt: string; mediaUrl?: string | null; caption?: string | null }
    | { type: "diagram"; steps: string[] }
    | {
        type: "storyboard";
        scenes: Array<{
            imagePrompt: string;
            caption: string;
            mediaUrl?: string | null;
        }>;
    };

interface GeminiInlineData {
    data?: string | null;
    mimeType?: string | null;
}

interface GeminiResponsePart {
    text?: string | null;
    inlineData?: GeminiInlineData | null;
}

const SECTION_LABELS = [
    { pattern: /game vision/i, label: "Game Vision" },
    { pattern: /concept art/i, label: "Concept Art" },
    { pattern: /core gameplay/i, label: "Core Gameplay" },
    { pattern: /gameplay loop/i, label: "Gameplay Loop" },
    { pattern: /character reveal/i, label: "Character Reveal" },
    { pattern: /trailer scene/i, label: "Trailer Scene" },
    { pattern: /one line hook/i, label: "One Line Hook" },
    { pattern: /main protagonist/i, label: "Main Protagonist" },
    { pattern: /main antagonist/i, label: "Main Antagonist" },
    { pattern: /world setting/i, label: "World Setting" },
    { pattern: /target player demographic/i, label: "Market Analysis" },
    { pattern: /background music style/i, label: "Audio Direction" },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function extractJsonCandidate(text: string) {
    const trimmed = text.trim();
    const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i);
    return fenced?.[1] ?? trimmed;
}

function normalizeText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeSteps(value: unknown) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((step) => normalizeText(step))
        .filter(Boolean);
}

function normalizeScenes(value: unknown) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((scene) => {
            if (!isRecord(scene)) {
                return null;
            }

            const imagePrompt = normalizeText(scene.imagePrompt ?? scene.imageprompt ?? scene.prompt);
            const caption = normalizeText(scene.caption);
            const mediaUrl = normalizeText(scene.mediaUrl) || null;

            if (!imagePrompt || !caption) {
                return null;
            }

            return { imagePrompt, caption, mediaUrl };
        })
        .filter((scene): scene is NonNullable<typeof scene> => scene !== null);
}

export function normalizeInterleavedBlocks(value: unknown): InterleavedContentBlock[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((block) => {
            if (!isRecord(block) || typeof block.type !== "string") {
                return null;
            }

            if (block.type === "text") {
                const content = normalizeText(block.content);
                return content ? { type: "text" as const, content } : null;
            }

            if (block.type === "image") {
                const prompt = normalizeText(block.prompt ?? block.imagePrompt ?? block.imageprompt);
                const caption = normalizeText(block.caption) || null;
                const mediaUrl = normalizeText(block.mediaUrl) || null;
                return prompt ? { type: "image" as const, prompt, caption, mediaUrl } : null;
            }

            if (block.type === "diagram") {
                const steps = normalizeSteps(block.steps);
                return steps.length > 0 ? { type: "diagram" as const, steps } : null;
            }

            if (block.type === "storyboard") {
                const scenes = normalizeScenes(block.scenes);
                return scenes.length > 0 ? { type: "storyboard" as const, scenes } : null;
            }

            return null;
        })
        .filter((block): block is InterleavedContentBlock => block !== null);
}

export function parseGeminiInterleavedResponse(text: string): InterleavedContentBlock[] {
    if (!text.trim()) {
        return [];
    }

    try {
        const parsed = JSON.parse(extractJsonCandidate(text)) as unknown;
        if (Array.isArray(parsed)) {
            return normalizeInterleavedBlocks(parsed);
        }

        if (isRecord(parsed) && Array.isArray(parsed.blocks)) {
            return normalizeInterleavedBlocks(parsed.blocks);
        }
    } catch {
        return [];
    }

    return [];
}

function detectSectionLabel(text: string, fallback: string) {
    const match = SECTION_LABELS.find((section) => section.pattern.test(text));
    return match?.label ?? fallback;
}

function stripSectionHeadings(text: string) {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => !SECTION_LABELS.some((section) => section.pattern.test(line)) && line !== "")
        .join("\n");
}

function parseDiagramSteps(text: string) {
    const arrowMatch = text.match(/([^\n]+(?:\s*[->→]\s*[^\n]+){2,})/);

    if (arrowMatch?.[1]) {
        const steps = arrowMatch[1]
            .split(/\s*(?:->|→)\s*/)
            .map((step) => step.trim())
            .filter(Boolean);

        return steps.length > 1 ? steps : [];
    }

    const numberedSteps = text
        .split(/\r?\n/)
        .map((line) => line.replace(/^\d+[\).\s-]*/, "").trim())
        .filter(Boolean);

    return numberedSteps.length > 2 ? numberedSteps : [];
}

function parseTextPart(text: string, fallbackSection: string) {
    const trimmed = text.trim();

    if (!trimmed) {
        return { blocks: [] as InterleavedContentBlock[], sectionLabel: fallbackSection };
    }

    const sectionLabel = detectSectionLabel(trimmed, fallbackSection);
    const cleaned = stripSectionHeadings(trimmed);
    const steps = /gameplay loop/i.test(trimmed) ? parseDiagramSteps(cleaned) : [];

    if (steps.length > 0) {
        const withoutSteps = cleaned.replace(/([^\n]+(?:\s*(?:->|→)\s*[^\n]+){2,})/g, "").trim();
        const blocks: InterleavedContentBlock[] = [];

        if (withoutSteps) {
            blocks.push({ type: "text", content: withoutSteps });
        }

        blocks.push({ type: "diagram", steps });
        return { blocks, sectionLabel };
    }

    const paragraphs = cleaned
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

    return {
        blocks: paragraphs.map((paragraph) => ({ type: "text" as const, content: paragraph })),
        sectionLabel,
    };
}

export function parseGeminiInterleavedParts(parts: GeminiResponsePart[], title: string) {
    const blocks: InterleavedContentBlock[] = [];
    let currentSection = "Concept Art";

    for (const part of parts) {
        if (part.text?.trim()) {
            const parsed = parseTextPart(part.text, currentSection);
            currentSection = parsed.sectionLabel;
            blocks.push(...parsed.blocks);
        }

        if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType || "image/png";
            blocks.push({
                type: "image",
                prompt: `${currentSection} for ${title}`,
                caption: currentSection,
                mediaUrl: `data:${mimeType};base64,${part.inlineData.data}`,
            });
        }
    }

    return blocks;
}

export function serializeInterleavedBlocks(blocks: InterleavedContentBlock[]) {
    return `${INTERLEAVED_CONTENT_PREFIX}${JSON.stringify({ blocks })}`;
}

export function parseStoredInterleavedContent(content: string | null | undefined) {
    if (!content || !content.startsWith(INTERLEAVED_CONTENT_PREFIX)) {
        return null;
    }

    try {
        const parsed = JSON.parse(content.slice(INTERLEAVED_CONTENT_PREFIX.length)) as { blocks?: unknown };
        return normalizeInterleavedBlocks(parsed.blocks ?? []);
    } catch {
        return null;
    }
}

export function interleavedBlocksToPlainText(blocks: InterleavedContentBlock[]) {
    return blocks
        .map((block) => {
            if (block.type === "text") {
                return block.content;
            }

            if (block.type === "image") {
                return [block.caption, `Image prompt: ${block.prompt}`].filter(Boolean).join("\n");
            }

            if (block.type === "diagram") {
                return block.steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
            }

            return block.scenes
                .map((scene, index) => `${index + 1}. ${scene.caption}\nImage prompt: ${scene.imagePrompt}`)
                .join("\n\n");
        })
        .filter(Boolean)
        .join("\n\n");
}
