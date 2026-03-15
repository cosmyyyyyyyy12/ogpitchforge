export type BlockType = 'text' | 'image' | 'audio' | 'table' | 'storyboard' | 'video';
export type BlockStatus = 'pending' | 'generating' | 'complete' | 'failed' | 'regenerating';
export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';
export type SaveStatus = 'saved' | 'saving' | 'error' | 'unsaved';

export interface InvestorSlide {
    id: string;
    title: string;
    bullets: string[];
    metric?: string | null;
}

export interface Block {
    blockId: string;
    type: BlockType;
    status: BlockStatus;
    content: string | null;       // text content or markdown
    mediaUrl: string | null;      // GCS URL for image/audio
    altText: string | null;       // image description
    transcript: string | null;    // audio script
    prompt: string | null;        // original generation prompt
    order: number;                // for drag-to-reorder
    error: string | null;         // per-block error message
}

export interface UserState {
    uid: string | null;
    email: string | null;
    avatar: string | null;
    displayName: string | null;
    credits: number;
    plan: 'free' | 'pro';
}
