'use client';

/**
 * Group Node Configuration
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { NodeConfigProps, GroupNodeData } from './types';
import { GROUP_COLORS } from './types';

export function GroupNodeConfig({ data, onUpdate }: NodeConfigProps<GroupNodeData>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Group Color</Label>
        <div className="grid grid-cols-4 gap-2">
          {GROUP_COLORS.map((color) => (
            <button
              key={color.value}
              className={cn(
                'h-8 rounded-md border-2 transition-all hover:scale-105',
                data.color === color.value ? 'border-foreground ring-2 ring-offset-2' : 'border-transparent'
              )}
              style={{ backgroundColor: color.value }}
              onClick={() => onUpdate({ color: color.value })}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Size</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Min Width</Label>
            <Input
              type="number"
              value={data.minWidth || 200}
              onChange={(e) => onUpdate({ minWidth: parseInt(e.target.value) || 200 })}
              className="h-8 text-sm"
              min={100}
              max={800}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Min Height</Label>
            <Input
              type="number"
              value={data.minHeight || 150}
              onChange={(e) => onUpdate({ minHeight: parseInt(e.target.value) || 150 })}
              className="h-8 text-sm"
              min={80}
              max={600}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Collapsed</Label>
          <p className="text-xs text-muted-foreground">Minimize the group</p>
        </div>
        <Switch
          checked={data.isCollapsed}
          onCheckedChange={(isCollapsed) => onUpdate({ isCollapsed })}
        />
      </div>

      {data.childNodeIds && data.childNodeIds.length > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium mb-1">Grouped Nodes</p>
          <p className="text-xs text-muted-foreground">
            {data.childNodeIds.length} node(s) in this group
          </p>
        </div>
      )}
    </div>
  );
}

export default GroupNodeConfig;
