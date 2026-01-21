'use client';

/**
 * EnvVarRow - Environment variable row component
 * Extracted from components/settings/system/project-env-config.tsx
 */

import { useState } from 'react';
import { Save, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableRow, TableCell } from '@/components/ui/table';

export interface EnvVarRowProps {
  name: string;
  value: string;
  onUpdate: (name: string, value: string) => void;
  onDelete: () => void;
}

export function EnvVarRow({ name, value, onUpdate, onDelete }: EnvVarRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onUpdate(name, editValue);
    setIsEditing(false);
  };

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{name}</TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        ) : (
          <span className="font-mono text-xs text-muted-foreground truncate block max-w-[200px]">
            {value}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {isEditing ? (
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleSave}>
            <Save className="h-3 w-3" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default EnvVarRow;
