'use client';

/**
 * Annotation Node Configuration
 */

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { NodeConfigProps, AnnotationNodeData } from './types';
import { ANNOTATION_COLORS } from './types';

export function AnnotationNodeConfig({ data, onUpdate }: NodeConfigProps<AnnotationNodeData>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Content</Label>
        <Textarea
          value={data.content || ''}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Enter your note..."
          className="text-sm min-h-[100px]"
          rows={4}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Background Color</Label>
        <div className="grid grid-cols-4 gap-2">
          {ANNOTATION_COLORS.map((color) => (
            <button
              key={color.value}
              className={cn(
                'h-8 rounded-md border-2 transition-all hover:scale-105',
                data.color === color.value ? 'border-foreground ring-2 ring-offset-2' : 'border-muted'
              )}
              style={{ backgroundColor: color.value }}
              onClick={() => onUpdate({ color: color.value })}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Font Size</Label>
        <Select
          value={data.fontSize || 'medium'}
          onValueChange={(value) => onUpdate({ fontSize: value as AnnotationNodeData['fontSize'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Show Border</Label>
          <p className="text-xs text-muted-foreground">Display a border around the note</p>
        </div>
        <Switch
          checked={data.showBorder}
          onCheckedChange={(showBorder) => onUpdate({ showBorder })}
        />
      </div>
    </div>
  );
}

export default AnnotationNodeConfig;
