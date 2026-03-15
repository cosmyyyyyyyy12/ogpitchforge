"use server";

import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { InvestorSlide } from "@/types/pitch";
import { StoredPitch } from "@/lib/server/pitch-data";
import { interleavedBlocksToPlainText, parseStoredInterleavedContent } from "@/lib/interleaved-content";

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

function getGeminiClient() {
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

function getPitchNarrative(pitch: StoredPitch) {
    const narrativeBlock = pitch.blocks.find((block) => block.type === "text");

    if (!narrativeBlock?.content) {
        return [
            `Title: ${pitch.title}`,
            `Genre: ${pitch.input.genre}`,
            `Core Mechanic: ${pitch.input.mechanic}`,
            `Audience: ${pitch.input.audience}`,
            `Platform: ${pitch.input.platform.join(", ")}`,
        ].join("\n");
    }

    const parsed = parseStoredInterleavedContent(narrativeBlock.content);
    return parsed ? interleavedBlocksToPlainText(parsed) : narrativeBlock.content;
}

function normalizeSlides(value: unknown): InvestorSlide[] {
    if (!value || typeof value !== "object" || !Array.isArray((value as { slides?: unknown[] }).slides)) {
        return [];
    }

    return (value as { slides: unknown[] }).slides
        .map((slide) => {
            if (!slide || typeof slide !== "object") {
                return null;
            }

            const record = slide as Record<string, unknown>;
            const title = typeof record.title === "string" ? record.title.trim() : "";
            const bullets = Array.isArray(record.bullets)
                ? record.bullets.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 5)
                : [];
            const metric = typeof record.metric === "string" ? record.metric.trim() : null;

            if (!title || bullets.length === 0) {
                return null;
            }

            return {
                id: randomUUID(),
                title,
                bullets,
                metric,
            } satisfies InvestorSlide;
        })
        .filter((slide): slide is InvestorSlide => slide !== null);
}

function fallbackSlides(pitch: StoredPitch): InvestorSlide[] {
    return [
        { id: randomUUID(), title: "Problem", bullets: ["Players crave fresh game worlds with strong visual identity.", "Many new game ideas fail to communicate their hook quickly.", "Studios need investor-ready storytelling from day one."], metric: "Clear pain point" },
        { id: randomUUID(), title: "Solution", bullets: [`${pitch.title} delivers a differentiated fantasy with a strong gameplay hook.`, "The pitch combines worldbuilding, concept art, and trailer-ready storytelling.", "It translates into a deck investors can understand in minutes."], metric: "Investor-ready vision" },
        { id: randomUUID(), title: "Market Opportunity", bullets: ["Targets genre fans looking for fresh premium experiences.", "Strong visual identity supports organic social and creator discovery.", "Can expand across sequels, DLC, and transmedia art assets."], metric: "Large adjacent market" },
        { id: randomUUID(), title: "Product", bullets: ["Core pitch transformed into a playable product vision.", "Clear fantasy, progression, and art direction.", "Designed to read well in trailers, screenshots, and deck form."], metric: pitch.input.genre },
        { id: randomUUID(), title: "Business Model", bullets: ["Premium game launch with deluxe edition potential.", "Add-on content and soundtrack/art book monetization.", "Strong concept art supports wishlist and campaign conversion."], metric: "Premium + expansions" },
        { id: randomUUID(), title: "Traction", bullets: ["Prototype-ready concept with deck-ready narrative.", "Concept art and slides accelerate publisher conversations.", "Creative assets support community building before launch."], metric: "Pitch-ready today" },
        { id: randomUUID(), title: "Competitive Advantage", bullets: ["Distinct core mechanic.", "Unified visual + narrative identity.", "AI-accelerated pre-production workflow lowers time to pitch."], metric: "Faster to market" },
        { id: randomUUID(), title: "Go To Market", bullets: ["Reveal through visual-first teasers and key art.", "Activate streamers and genre communities early.", "Use trailer beats and concept art to drive wishlists."], metric: "Visual-first launch" },
        { id: randomUUID(), title: "Roadmap", bullets: ["Concept validation and prototype.", "Vertical slice and art benchmark.", "Publisher pitch, production, and launch ramp."], metric: "Three-stage plan" },
        { id: randomUUID(), title: "Financials", bullets: ["Lean pre-production supported by AI-assisted creative workflows.", "Art and deck assets produced early to de-risk funding conversations.", "Budget expands only after milestone validation."], metric: "Capital efficient" },
        { id: randomUUID(), title: "The Ask", bullets: ["Funding for prototype and vertical slice.", "Strategic publishing and platform support.", "Partnership to turn concept into market-ready production."], metric: "Seed / pre-seed ask" },
    ];
}

export async function generateInvestorSlides(pitch: StoredPitch): Promise<InvestorSlide[]> {
    const ai = getGeminiClient();

    if (!ai) {
        return fallbackSlides(pitch);
    }

    const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
    const prompt = [
        "You are an expert VC pitch deck strategist for game startups.",
        "Convert the following game pitch into an investor-ready presentation.",
        "",
        "Rules:",
        "- Return valid JSON only",
        "- Use the schema {\"slides\":[{\"title\":\"...\",\"bullets\":[\"...\"],\"metric\":\"...\"}]}",
        "- Follow VC pitch deck order",
        "- Each slide must have 3 to 5 concise bullets",
        "- Keep language sharp, investor-ready, and specific",
        "- Include metric only when useful",
        "",
        "Required slides:",
        "Problem",
        "Solution",
        "Market Opportunity",
        "Product",
        "Business Model",
        "Traction",
        "Competitive Advantage",
        "Go To Market",
        "Roadmap",
        "Financials",
        "The Ask",
        "",
        "GAME PITCH:",
        getPitchNarrative(pitch),
    ].join("\n");

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            temperature: 0.4,
        },
    });

    const text = response.text?.trim();
    if (!text) {
        return fallbackSlides(pitch);
    }

    try {
        const fenced = text.match(/```json\s*([\s\S]*?)```/i);
        const parsed = JSON.parse(fenced?.[1] ?? text) as unknown;
        const slides = normalizeSlides(parsed);
        return slides.length > 0 ? slides : fallbackSlides(pitch);
    } catch {
        return fallbackSlides(pitch);
    }
}
