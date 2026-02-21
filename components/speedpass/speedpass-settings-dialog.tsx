'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useSpeedPassUser } from '@/hooks/learning';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { SpeedPassUserProfile } from '@/hooks/learning/use-speedpass-user';
import type { SpeedLearningMode } from '@/types/learning/speedpass';

interface SpeedPassSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SpeedPassSettingsDraft {
  preferredMode: SpeedLearningMode;
  dailyStudyTargetInput: string;
  reminderEnabled: boolean;
  reminderTime: string;
}

function createDraftFromProfile(profile: SpeedPassUserProfile): SpeedPassSettingsDraft {
  return {
    preferredMode: profile.preferredMode,
    dailyStudyTargetInput: String(profile.dailyStudyTarget),
    reminderEnabled: profile.reminderEnabled,
    reminderTime: profile.reminderTime || '20:00',
  };
}

interface SettingsDialogContentProps {
  profile: SpeedPassUserProfile;
  onCancel: () => void;
  onSave: (input: {
    preferredMode: SpeedLearningMode;
    dailyStudyTarget: number;
    reminderEnabled: boolean;
    reminderTime?: string;
  }) => void;
}

function SettingsDialogContent({
  profile,
  onCancel,
  onSave,
}: SettingsDialogContentProps) {
  const [draft, setDraft] = useState<SpeedPassSettingsDraft>(() => createDraftFromProfile(profile));

  const handleSave = () => {
    const parsedDailyTarget = Number.parseInt(draft.dailyStudyTargetInput, 10);
    const normalizedDailyTarget = Number.isFinite(parsedDailyTarget)
      ? Math.min(600, Math.max(10, parsedDailyTarget))
      : 60;

    onSave({
      preferredMode: draft.preferredMode,
      dailyStudyTarget: normalizedDailyTarget,
      reminderEnabled: draft.reminderEnabled,
      reminderTime: draft.reminderEnabled ? draft.reminderTime : undefined,
    });
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>速通设置</DialogTitle>
        <DialogDescription>管理学习模式、每日目标与提醒设置。</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="speedpass-preferred-mode">默认学习模式</Label>
          <Select
            value={draft.preferredMode}
            onValueChange={(value) =>
              setDraft((prev) => ({ ...prev, preferredMode: value as SpeedLearningMode }))
            }
          >
            <SelectTrigger id="speedpass-preferred-mode" aria-label="默认学习模式">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="extreme">极速模式</SelectItem>
              <SelectItem value="speed">速成模式</SelectItem>
              <SelectItem value="comprehensive">全面模式</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="speedpass-daily-target">每日学习目标（分钟）</Label>
          <Input
            id="speedpass-daily-target"
            aria-label="每日学习目标分钟"
            type="number"
            min={10}
            max={600}
            value={draft.dailyStudyTargetInput}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, dailyStudyTargetInput: event.target.value }))
            }
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">学习提醒</p>
            <p className="text-xs text-muted-foreground">每日固定时间提醒开始速通学习</p>
          </div>
          <Switch
            checked={draft.reminderEnabled}
            onCheckedChange={(checked) =>
              setDraft((prev) => ({ ...prev, reminderEnabled: checked }))
            }
            aria-label="学习提醒开关"
          />
        </div>

        {draft.reminderEnabled && (
          <div className="space-y-2">
            <Label htmlFor="speedpass-reminder-time">提醒时间</Label>
            <Input
              id="speedpass-reminder-time"
              aria-label="提醒时间"
              type="time"
              value={draft.reminderTime}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, reminderTime: event.target.value }))
              }
            />
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={handleSave}>保存</Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function SpeedPassSettingsDialog({ open, onOpenChange }: SpeedPassSettingsDialogProps) {
  const { profile, updateProfile } = useSpeedPassUser();

  const handleSave = useCallback(
    (input: {
      preferredMode: SpeedLearningMode;
      dailyStudyTarget: number;
      reminderEnabled: boolean;
      reminderTime?: string;
    }) => {
      updateProfile(input);
      toast.success('速通设置已保存');
      onOpenChange(false);
    },
    [onOpenChange, updateProfile]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SettingsDialogContent
          key={`${profile.id}-settings`}
          profile={profile}
          onCancel={() => onOpenChange(false)}
          onSave={handleSave}
        />
      ) : null}
    </Dialog>
  );
}

export default SpeedPassSettingsDialog;
