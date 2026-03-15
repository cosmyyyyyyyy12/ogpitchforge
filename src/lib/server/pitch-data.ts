import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { Block, InvestorSlide } from "@/types/pitch";
import { parseStoredInterleavedContent } from "@/lib/interleaved-content";

export type PitchLifecycleStatus = "draft" | "generating" | "complete";

export interface PitchInput {
    title: string;
    genre: string;
    mechanic: string;
    tone: string[];
    audience: string;
    platform: string[];
}

export interface StoredPitch {
    id: string;
    title: string;
    input: PitchInput;
    blocks: Block[];
    slides: InvestorSlide[];
    createdAt: string;
    updatedAt: string;
    status: PitchLifecycleStatus;
}

interface PitchDatabase {
    pitches: Record<string, StoredPitch>;
}

export interface PitchSummary {
    id: string;
    title: string;
    date: string;
    status: "Completed" | "Generating" | "Draft";
    thumbnail?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "pitches.json");

let writeQueue = Promise.resolve();

function emptyDatabase(): PitchDatabase {
    return { pitches: {} };
}

function normalizeStoredPitch(pitch: Omit<StoredPitch, "slides"> & { slides?: InvestorSlide[] }): StoredPitch {
    return {
        ...pitch,
        slides: Array.isArray(pitch.slides) ? pitch.slides : [],
    };
}

async function ensureDatabaseFile() {
    await mkdir(DATA_DIR, { recursive: true });

    try {
        await readFile(DATA_FILE, "utf8");
    } catch {
        await writeFile(DATA_FILE, JSON.stringify(emptyDatabase(), null, 2), "utf8");
    }
}

async function readDatabase(): Promise<PitchDatabase> {
    await ensureDatabaseFile();
    const raw = await readFile(DATA_FILE, "utf8");

    if (!raw.trim()) {
        return emptyDatabase();
    }

    const parsed = JSON.parse(raw) as {
        pitches?: Record<string, Omit<StoredPitch, "slides"> & { slides?: InvestorSlide[] }>;
    };

    return {
        pitches: Object.fromEntries(
            Object.entries(parsed.pitches ?? {}).map(([id, pitch]) => [id, normalizeStoredPitch(pitch)])
        ),
    };
}

async function writeDatabase(database: PitchDatabase) {
    await ensureDatabaseFile();
    await writeFile(DATA_FILE, JSON.stringify(database, null, 2), "utf8");
}

function queueWrite<T>(operation: () => Promise<T>): Promise<T> {
    const result = writeQueue.then(operation, operation);
    writeQueue = result.then(() => undefined, () => undefined);
    return result;
}

function toSummary(pitch: StoredPitch): PitchSummary {
    const directThumbnail = pitch.blocks.find((block) => block.type === "image" && block.mediaUrl)?.mediaUrl;
    const interleavedThumbnail = pitch.blocks
        .map((block) => parseStoredInterleavedContent(block.content))
        .flatMap((blocks) => blocks ?? [])
        .find((block) => {
            if (block.type === "image") {
                return !!block.mediaUrl;
            }

            if (block.type === "storyboard") {
                return block.scenes.some((scene) => !!scene.mediaUrl);
            }

            return false;
        });

    const thumbnail = directThumbnail
        ?? (interleavedThumbnail?.type === "image"
            ? interleavedThumbnail.mediaUrl
            : interleavedThumbnail?.type === "storyboard"
                ? interleavedThumbnail.scenes.find((scene) => !!scene.mediaUrl)?.mediaUrl
                : undefined);
    const status =
        pitch.status === "complete" ? "Completed" :
            pitch.status === "generating" ? "Generating" :
                "Draft";

    return {
        id: pitch.id,
        title: pitch.title,
        date: new Date(pitch.updatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }),
        status,
        thumbnail,
    };
}

export async function listPitches(): Promise<PitchSummary[]> {
    const database = await readDatabase();

    return Object.values(database.pitches)
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .map(toSummary);
}

export async function createPitch(input: PitchInput): Promise<StoredPitch> {
    return queueWrite(async () => {
        const database = await readDatabase();
        const now = new Date().toISOString();
        const pitch: StoredPitch = {
            id: randomUUID(),
            title: input.title.trim() || "Untitled Pitch",
            input,
            blocks: [],
            slides: [],
            createdAt: now,
            updatedAt: now,
            status: "draft",
        };

        database.pitches[pitch.id] = pitch;
        await writeDatabase(database);

        return pitch;
    });
}

export async function getPitch(id: string): Promise<StoredPitch | null> {
    const database = await readDatabase();
    return database.pitches[id] ?? null;
}

export async function deletePitch(id: string): Promise<boolean> {
    return queueWrite(async () => {
        const database = await readDatabase();

        if (!database.pitches[id]) {
            return false;
        }

        delete database.pitches[id];
        await writeDatabase(database);
        return true;
    });
}

export async function updatePitch(
    id: string,
    updates: Partial<Pick<StoredPitch, "title" | "blocks" | "slides" | "status">>,
): Promise<StoredPitch | null> {
    return queueWrite(async () => {
        const database = await readDatabase();
        const existing = database.pitches[id];

        if (!existing) {
            return null;
        }

        const next: StoredPitch = {
            ...existing,
            ...updates,
            title: updates.title ?? existing.title,
            blocks: updates.blocks ?? existing.blocks,
            slides: updates.slides ?? existing.slides,
            status: updates.status ?? existing.status,
            updatedAt: new Date().toISOString(),
        };

        database.pitches[id] = next;
        await writeDatabase(database);

        return next;
    });
}

export async function appendBlockToPitch(id: string, block: Block, status?: PitchLifecycleStatus) {
    return queueWrite(async () => {
        const database = await readDatabase();
        const existing = database.pitches[id];

        if (!existing) {
            return null;
        }

        const next: StoredPitch = {
            ...existing,
            blocks: [...existing.blocks.filter((item) => item.blockId !== block.blockId), block].sort((a, b) => a.order - b.order),
            status: status ?? existing.status,
            updatedAt: new Date().toISOString(),
        };

        database.pitches[id] = next;
        await writeDatabase(database);

        return next;
    });
}

export async function updatePitchSlides(id: string, slides: InvestorSlide[]) {
    return queueWrite(async () => {
        const database = await readDatabase();
        const existing = database.pitches[id];

        if (!existing) {
            return null;
        }

        const next: StoredPitch = {
            ...existing,
            slides,
            updatedAt: new Date().toISOString(),
        };

        database.pitches[id] = next;
        await writeDatabase(database);

        return next;
    });
}

export async function replaceBlock(blockId: string, block: Block): Promise<StoredPitch | null> {
    return queueWrite(async () => {
        const database = await readDatabase();
        const pitch = Object.values(database.pitches).find((entry) => entry.blocks.some((item) => item.blockId === blockId));

        if (!pitch) {
            return null;
        }

        const next: StoredPitch = {
            ...pitch,
            blocks: pitch.blocks.map((item) => item.blockId === blockId ? block : item),
            updatedAt: new Date().toISOString(),
        };

        database.pitches[pitch.id] = next;
        await writeDatabase(database);

        return next;
    });
}

export async function getPitchByBlockId(blockId: string): Promise<{ pitch: StoredPitch; block: Block } | null> {
    const database = await readDatabase();

    for (const pitch of Object.values(database.pitches)) {
        const block = pitch.blocks.find((item) => item.blockId === blockId);

        if (block) {
            return { pitch, block };
        }
    }

    return null;
}
