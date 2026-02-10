'use client';

/**
 * SyncAdvancedSettings - Shared UI controls for maxBackups and syncDataTypes
 * Used by all provider config forms (WebDAV, GitHub, Google Drive)
 */

import { useTranslations } from 'next-intl';
import { Archive, Filter } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import type { SyncDataType } from '@/types/sync';
import { ALL_SYNC_DATA_TYPES } from '@/types/sync';

const DATA_TYPE_LABELS: Record<SyncDataType, { label: string; desc: string }> = {
  settings: { label: 'Settings', desc: 'App preferences and configuration' },
  sessions: { label: 'Sessions', desc: 'Chat session metadata' },
  messages: { label: 'Messages', desc: 'Chat message history' },
  artifacts: { label: 'Artifacts', desc: 'Generated code and content' },
  folders: { label: 'Folders', desc: 'Folder organization' },
  projects: { label: 'Projects', desc: 'Project data' },
};

interface SyncAdvancedSettingsProps {
  maxBackups: number;
  syncDataTypes: SyncDataType[];
  onMaxBackupsChange: (value: number) => void;
  onSyncDataTypesChange: (types: SyncDataType[]) => void;
}

export function SyncAdvancedSettings({
  maxBackups,
  syncDataTypes,
  onMaxBackupsChange,
  onSyncDataTypesChange,
}: SyncAdvancedSettingsProps) {
  const t = useTranslations('syncSettings');

  const handleToggleType = (type: SyncDataType, checked: boolean) => {
    if (checked) {
      onSyncDataTypesChange([...syncDataTypes, type]);
    } else {
      const updated = syncDataTypes.filter((t) => t !== type);
      onSyncDataTypesChange(updated);
    }
  };

  const isAllSelected = syncDataTypes.length === 0;

  const handleToggleAll = () => {
    if (isAllSelected) {
      // Switch from "all" to explicit selection of all types
      onSyncDataTypesChange([...ALL_SYNC_DATA_TYPES]);
    } else {
      // Clear selection = sync all
      onSyncDataTypesChange([]);
    }
  };

  return (
    <>
      {/* Max Backups */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Archive className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-sm">
            {t('maxBackups') || 'Max Backups'}: {maxBackups === 0 ? (t('unlimited') || 'Unlimited') : maxBackups}
          </Label>
        </div>
        <Slider
          value={[maxBackups]}
          onValueChange={([value]) => onMaxBackupsChange(value)}
          min={0}
          max={50}
          step={1}
        />
        <p className="text-xs text-muted-foreground">
          {t('maxBackupsDesc') || 'Number of backup files to keep. 0 = unlimited.'}
        </p>
      </div>

      {/* Selective Sync */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-sm">{t('selectiveSync') || 'Data Types to Sync'}</Label>
        </div>

        <div className="flex items-center space-x-2 pb-1">
          <Checkbox
            id="sync-all"
            checked={isAllSelected}
            onCheckedChange={handleToggleAll}
          />
          <label htmlFor="sync-all" className="text-sm font-medium cursor-pointer">
            {t('syncAll') || 'Sync All'}
          </label>
          <span className="text-xs text-muted-foreground">
            {t('syncAllDesc') || '(recommended)'}
          </span>
        </div>

        {!isAllSelected && (
          <div className="grid grid-cols-2 gap-2 pl-2">
            {ALL_SYNC_DATA_TYPES.map((type) => (
              <div key={type} className="flex items-start space-x-2">
                <Checkbox
                  id={`sync-${type}`}
                  checked={syncDataTypes.includes(type)}
                  onCheckedChange={(checked) => handleToggleType(type, !!checked)}
                />
                <div className="grid gap-0.5 leading-none">
                  <label htmlFor={`sync-${type}`} className="text-sm cursor-pointer">
                    {DATA_TYPE_LABELS[type].label}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {DATA_TYPE_LABELS[type].desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
