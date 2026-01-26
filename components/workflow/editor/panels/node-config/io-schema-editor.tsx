'use client';

/**
 * IO Schema Editor
 * Component for editing input/output parameters
 */

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { IOSchemaEditorProps, IOSchemaType } from './types';

export function IOSchemaEditor({ schema, onChange, type }: IOSchemaEditorProps) {
  const t = useTranslations('workflowEditor');
  const entries = Object.entries(schema);

  const handleAdd = () => {
    const newKey = `${type}_${Date.now()}`;
    onChange({
      ...schema,
      [newKey]: { type: 'string', description: '', required: false },
    });
  };

  const handleRemove = (key: string) => {
    const { [key]: _, ...rest } = schema;
    onChange(rest);
  };

  const handleUpdate = (key: string, updates: Partial<{ type: IOSchemaType; description: string; required: boolean }>) => {
    onChange({
      ...schema,
      [key]: { ...schema[key], ...updates },
    });
  };

  const handleRename = (oldKey: string, newKey: string) => {
    if (oldKey === newKey || !newKey) return;
    const { [oldKey]: value, ...rest } = schema;
    onChange({ ...rest, [newKey]: value });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">
          {type === 'input' ? t('inputParameters') : t('outputParameters')}
        </Label>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={handleAdd}
        >
          <Plus className="h-3 w-3 mr-1" />
          {t('add')}
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          {t('noParameters')}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value]) => (
            <div key={key} className="border rounded-lg p-2 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={key}
                  onChange={(e) => handleRename(key, e.target.value)}
                  className="h-7 text-xs font-mono flex-1"
                  placeholder={t('parameterName')}
                />
                <Select
                  value={value.type}
                  onValueChange={(type) => handleUpdate(key, { type: type as IOSchemaType })}
                >
                  <SelectTrigger className="h-7 text-xs w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="object">Object</SelectItem>
                    <SelectItem value="array">Array</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleRemove(key)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <Input
                value={value.description}
                onChange={(e) => handleUpdate(key, { description: e.target.value })}
                className="h-7 text-xs"
                placeholder={t('parameterDescription')}
              />
              <div className="flex items-center gap-2">
                <Switch
                  id={`required-${key}`}
                  checked={value.required}
                  onCheckedChange={(required) => handleUpdate(key, { required })}
                />
                <Label htmlFor={`required-${key}`} className="text-xs">
                  {t('required')}
                </Label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default IOSchemaEditor;
