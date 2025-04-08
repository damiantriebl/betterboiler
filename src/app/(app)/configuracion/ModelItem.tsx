import React, { forwardRef, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelItemProps {
    id: string;
    isDragging?: boolean;
    brandColor?: string;
}

const ModelItem = forwardRef<HTMLDivElement, ModelItemProps>(
    ({ id, isDragging, brandColor = '#ffffff', ...props }, ref) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging: isSortableDragging,
        } = useSortable({ id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isSortableDragging || isDragging ? 0.5 : 1,
            cursor: isSortableDragging || isDragging ? 'grabbing' : 'grab',
            borderLeftColor: brandColor,
        };

        const combinedRef = (node: HTMLDivElement | null) => {
            setNodeRef(node);
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
        };

        return (
            <Card
                ref={combinedRef}
                style={style}
                className={cn(
                    "p-3 flex items-center justify-between touch-none select-none border-l-4",
                    isSortableDragging || isDragging ? "shadow-lg z-10 ring-2 ring-primary" : "shadow"
                )}
                {...props}
            >
                <span className="flex-grow mr-2">{id}</span>
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab focus:outline-none"
                    aria-label={`Arrastrar modelo ${id}`}
                >
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </button>
            </Card>
        );
    }
);

ModelItem.displayName = 'ModelItem';
export default ModelItem;
