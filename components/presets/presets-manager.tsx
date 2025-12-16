'use client';

/**
 * PresetsManager - full page/dialog for managing all presets
 */

import { useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PresetCard } from './preset-card';
import { CreatePresetDialog } from './create-preset-dialog';
import { usePresetStore } from '@/stores';
import type { Preset } from '@/types/preset';

interface PresetsManagerProps {
  onSelectPreset?: (preset: Preset) => void;
}

export function PresetsManager({ onSelectPreset }: PresetsManagerProps) {
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editPreset, setEditPreset] = useState<Preset | null>(null);
  const [deletePreset, setDeletePreset] = useState<Preset | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const presets = usePresetStore((state) => state.presets);
  const selectedPresetId = usePresetStore((state) => state.selectedPresetId);
  const selectPreset = usePresetStore((state) => state.selectPreset);
  const applyPreset = usePresetStore((state) => state.usePreset);
  const deletePresetAction = usePresetStore((state) => state.deletePreset);
  const duplicatePreset = usePresetStore((state) => state.duplicatePreset);
  const setDefaultPreset = usePresetStore((state) => state.setDefaultPreset);
  const resetToDefaults = usePresetStore((state) => state.resetToDefaults);
  const searchPresets = usePresetStore((state) => state.searchPresets);

  const filteredPresets = search ? searchPresets(search) : presets;

  const handleSelect = (preset: Preset) => {
    selectPreset(preset.id);
    applyPreset(preset.id);
    onSelectPreset?.(preset);
  };

  const handleEdit = (preset: Preset) => {
    setEditPreset(preset);
    setCreateDialogOpen(true);
  };

  const handleDuplicate = (preset: Preset) => {
    duplicatePreset(preset.id);
  };

  const handleDelete = () => {
    if (deletePreset) {
      deletePresetAction(deletePreset.id);
      setDeletePreset(null);
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setShowResetDialog(false);
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
    setEditPreset(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search presets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResetDialog(true)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Preset
          </Button>
        </div>
      </div>

      {/* Presets Grid */}
      {filteredPresets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">
            {search ? 'No presets found' : 'No presets yet'}
          </p>
          {!search && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first preset
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPresets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isSelected={preset.id === selectedPresetId}
              onSelect={() => handleSelect(preset)}
              onEdit={() => handleEdit(preset)}
              onDuplicate={() => handleDuplicate(preset)}
              onDelete={() => setDeletePreset(preset)}
              onSetDefault={() => setDefaultPreset(preset.id)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CreatePresetDialog
        open={createDialogOpen}
        onOpenChange={handleCreateDialogClose}
        editPreset={editPreset}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletePreset}
        onOpenChange={(open) => !open && setDeletePreset(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletePreset?.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Default Presets</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all your custom presets and restore the default
              presets. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PresetsManager;
