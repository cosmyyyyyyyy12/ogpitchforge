"use client";

import React from "react";
import { Block } from "@/types/pitch";
import { TextBlock } from "@/components/pitch/text-block";
import { ImageBlock } from "@/components/pitch/image-block";
import { AudioBlock } from "@/components/pitch/audio-block";
import { TableBlock } from "@/components/pitch/table-block";
import { VideoBlock } from "@/components/pitch/video-block";

interface BlockGalleryProps {
    blocks: Block[];
    isReadOnly?: boolean;
    activeBlockId?: string | null;
    onUpdateBlock?: (blockId: string, content: string) => void;
    onRegenerateBlock?: (blockId: string, newPrompt?: string) => void;
    onSelectBlock?: (blockId: string) => void;
}

export const BlockGallery: React.FC<BlockGalleryProps> = ({
    blocks,
    isReadOnly = false,
    activeBlockId = null,
    onUpdateBlock,
    onRegenerateBlock,
    onSelectBlock
}) => {
    return (
        <div className="space-y-4">
            {blocks.map((block) => {
                const props = {
                    block,
                    isActive: !isReadOnly && activeBlockId === block.blockId,
                    onSelect: () => !isReadOnly && onSelectBlock?.(block.blockId),
                    onRegenerate: (newPrompt?: string) => !isReadOnly && onRegenerateBlock?.(block.blockId, newPrompt),
                    onUpdate: (content: string) => !isReadOnly && onUpdateBlock?.(block.blockId, content),
                    isReadOnly
                };

                // If read-only, we might want to pass a flag to block components 
                // to hide toolbars. But for now, they check block.status === 'complete' 
                // and group-hover opacity. In read-only mode, we can just not pass 
                // those handlers or wrap them to be no-ops.

                switch (block.type) {
                    case "text": return <TextBlock key={block.blockId} {...props} />;
                    case "image": return <ImageBlock key={block.blockId} {...props} />;
                    case "video": return <VideoBlock key={block.blockId} {...props} />;
                    case "audio": return <AudioBlock key={block.blockId} {...props} />;
                    case "table":
                    case "storyboard": return <TableBlock key={block.blockId} {...props} />;
                    default: return null;
                }
            })}
        </div>
    );
};
