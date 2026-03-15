import { create } from 'zustand';
import { Block, StreamStatus, SaveStatus } from '@/types/pitch';

interface PitchState {
    pitchId: string | null;
    pitchTitle: string;
    titleEditMode: boolean;
    streamStatus: StreamStatus;
    streamError: string | null;
    blocks: Block[];
    activeBlockId: string | null;
    lastSaved: Date | null;
    saveStatus: SaveStatus;
    isDirty: boolean;
}

interface PitchActions {
    setStream: (pitchId: string, title: string) => void;
    appendBlock: (block: Block) => void;
    updateBlock: (blockId: string, partial: Partial<Block>) => void;
    reorderBlocks: (newBlocks: Block[]) => void;
    setBlockRegenerating: (blockId: string) => void;
    setBlockComplete: (blockId: string, newContent: string) => void;
    setBlockFailed: (blockId: string, errorMsg: string) => void;
    setStreamStatus: (status: StreamStatus) => void;
    setSaveStatus: (status: SaveStatus) => void;
    setIsDirty: (isDirty: boolean) => void;
    setTitleEditMode: (bool: boolean) => void;
    updateTitle: (title: string) => void;
    clearPitch: () => void;
}

export const usePitchStore = create<PitchState & PitchActions>((set) => ({
    pitchId: null,
    pitchTitle: 'Untitled Pitch',
    titleEditMode: false,
    streamStatus: 'idle',
    streamError: null,
    blocks: [],
    activeBlockId: null,
    lastSaved: null,
    saveStatus: 'saved',
    isDirty: false,

    setStream: (pitchId, title) => set({
        pitchId,
        pitchTitle: title,
        streamStatus: 'connecting',
        blocks: [],
        isDirty: false,
        saveStatus: 'saved'
    }),

    appendBlock: (block) => set((state) => ({
        blocks: [...state.blocks, block].sort((a, b) => a.order - b.order),
        isDirty: true,
        saveStatus: 'unsaved'
    })),

    updateBlock: (blockId, partial) => set((state) => ({
        blocks: state.blocks.map((b) => b.blockId === blockId ? { ...b, ...partial } : b),
        isDirty: true,
        saveStatus: 'unsaved'
    })),

    reorderBlocks: (newBlocks) => set({
        blocks: newBlocks,
        isDirty: true,
        saveStatus: 'unsaved'
    }),

    setBlockRegenerating: (blockId) => set((state) => ({
        blocks: state.blocks.map((b) => b.blockId === blockId ? { ...b, status: 'regenerating' } : b),
        isDirty: true,
        saveStatus: 'unsaved'
    })),

    setBlockComplete: (blockId, newContent) => set((state) => ({
        blocks: state.blocks.map((b) => b.blockId === blockId ? { ...b, content: newContent, status: 'complete' } : b),
        isDirty: true,
        saveStatus: 'unsaved'
    })),

    setBlockFailed: (blockId, errorMsg) => set((state) => ({
        blocks: state.blocks.map((b) => b.blockId === blockId ? { ...b, status: 'failed', error: errorMsg } : b),
        isDirty: true,
        saveStatus: 'unsaved'
    })),

    setStreamStatus: (status) => set({ streamStatus: status }),

    setSaveStatus: (status) => set({ saveStatus: status }),

    setIsDirty: (isDirty) => set({ isDirty }),

    setTitleEditMode: (bool) => set({ titleEditMode: bool }),

    updateTitle: (title) => set({
        pitchTitle: title,
        isDirty: true,
        saveStatus: 'unsaved'
    }),

    clearPitch: () => set({
        pitchId: null,
        pitchTitle: 'Untitled Pitch',
        titleEditMode: false,
        streamStatus: 'idle',
        streamError: null,
        blocks: [],
        activeBlockId: null,
        lastSaved: null,
        saveStatus: 'saved',
        isDirty: false
    }),
}));
