import { Paperclip } from 'lucide-react';

interface DragOverlayProps {
  isDragging: boolean;
  label: string;
}

export function DragOverlay({ isDragging, label }: DragOverlayProps) {
  if (!isDragging) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/80 supports-[backdrop-filter]:bg-background/70 backdrop-blur-md animate-in fade-in-0 duration-200">
      <div className="flex flex-col items-center gap-3 text-primary animate-in zoom-in-95 duration-200">
        <div className="rounded-full bg-primary/10 p-4">
          <Paperclip className="h-10 w-10" />
        </div>
        <span className="text-lg font-medium">{label}</span>
      </div>
    </div>
  );
}
