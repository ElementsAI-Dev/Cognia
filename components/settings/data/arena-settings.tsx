'use client';

import { useTranslations } from 'next-intl';
import { Swords, Trash2, Download, Upload, RotateCcw, Trophy, BarChart3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  SettingsCard,
  SettingsEmptyState,
  SettingsGrid,
  SettingsPageHeader,
} from '@/components/settings/common/settings-section';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useArenaStore } from '@/stores/arena';
import { exportPreferences, importPreferences } from '@/lib/ai/generation/preference-learner';

export function ArenaSettings() {
  const t = useTranslations('arena.settings');
  const tArena = useTranslations('arena');
  const tCommon = useTranslations('common');

  // Arena store
  const settings = useArenaStore((state) => state.settings);
  const updateSettings = useArenaStore((state) => state.updateSettings);
  const resetSettings = useArenaStore((state) => state.resetSettings);
  const _battles = useArenaStore((state) => state.battles);
  const modelRatings = useArenaStore((state) => state.modelRatings);
  const clearBattleHistory = useArenaStore((state) => state.clearBattleHistory);
  const resetModelRatings = useArenaStore((state) => state.resetModelRatings);
  const clearPreferences = useArenaStore((state) => state.clearPreferences);
  const getStats = useArenaStore((state) => state.getStats);

  const stats = getStats();

  // Export preferences to JSON file
  const handleExport = () => {
    const data = exportPreferences();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arena-preferences-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import preferences from JSON file
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.preferences) {
          importPreferences(data);
        }
      } catch (err) {
        console.error('Failed to import preferences:', err);
      }
    };
    input.click();
  };

  // Clear all arena data
  const handleClearAll = () => {
    clearBattleHistory();
    resetModelRatings();
    clearPreferences();
  };

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        icon={<Swords className="h-6 w-6" />}
        title={t('title')}
        description={tArena('description')}
      />

      <SettingsGrid>
        {/* Enable/Disable */}
        <SettingsCard
          title={t('enabled')}
          description={tArena('description')}
        >
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => updateSettings({ enabled: checked })}
          />
        </SettingsCard>

        {/* Default Model Count */}
        <SettingsCard
          title={t('defaultCount')}
          description={`${settings.defaultModelCount} models`}
        >
          <div className="w-32">
            <Slider
              value={[settings.defaultModelCount]}
              onValueChange={([value]) => updateSettings({ defaultModelCount: value })}
              min={2}
              max={4}
              step={1}
            />
          </div>
        </SettingsCard>

        {/* Auto-select Models */}
        <SettingsCard
          title={t('autoSelect')}
          description="Automatically select models based on tier"
        >
          <Switch
            checked={settings.autoSelectModels}
            onCheckedChange={(checked) => updateSettings({ autoSelectModels: checked })}
          />
        </SettingsCard>

        {/* Preference Learning */}
        <SettingsCard
          title={t('learning')}
          description={t('learningDescription')}
        >
          <Switch
            checked={settings.preferenceLearning}
            onCheckedChange={(checked) => updateSettings({ preferenceLearning: checked })}
          />
        </SettingsCard>

        {/* Default Mode */}
        <SettingsCard
          title={t('defaultMode')}
          description="Choose whether to show or hide model names"
        >
          <Select
            value={settings.defaultMode}
            onValueChange={(value) => updateSettings({ defaultMode: value as 'normal' | 'blind' })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">{t('normalMode')}</SelectItem>
              <SelectItem value="blind">{t('blindMode')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingsCard>

        {/* History Retention */}
        <SettingsCard
          title={t('retention')}
          description={`${settings.historyRetentionDays} days`}
        >
          <div className="w-32">
            <Slider
              value={[settings.historyRetentionDays]}
              onValueChange={([value]) => updateSettings({ historyRetentionDays: value })}
              min={7}
              max={90}
              step={7}
            />
          </div>
        </SettingsCard>

        {/* Show Cost Estimates */}
        <SettingsCard
          title={t('showCost')}
          description="Display estimated cost per response"
        >
          <Switch
            checked={settings.showCostEstimates}
            onCheckedChange={(checked) => updateSettings({ showCostEstimates: checked })}
          />
        </SettingsCard>

        {/* Show Token Counts */}
        <SettingsCard
          title={t('showTokens')}
          description="Display token counts for each response"
        >
          <Switch
            checked={settings.showTokenCounts}
            onCheckedChange={(checked) => updateSettings({ showTokenCounts: checked })}
          />
        </SettingsCard>
      </SettingsGrid>

      {/* Statistics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {tArena('stats.title')}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl font-bold">{stats.totalBattles}</div>
            <div className="text-sm text-muted-foreground">{tArena('stats.totalBattles')}</div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl font-bold">{stats.completedBattles}</div>
            <div className="text-sm text-muted-foreground">{tArena('stats.completedBattles')}</div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl font-bold">{stats.totalTies}</div>
            <div className="text-sm text-muted-foreground">{tArena('stats.ties')}</div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl font-bold">{modelRatings.length}</div>
            <div className="text-sm text-muted-foreground">Models Rated</div>
          </div>
        </div>
      </div>

      {/* Top Models */}
      {modelRatings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {tArena('stats.topModels')}
          </h3>

          <ScrollArea className="h-[200px] rounded-lg border">
            <div className="p-4 space-y-2">
              {modelRatings
                .slice()
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 10)
                .map((rating, index) => (
                  <div
                    key={rating.modelId}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={index < 3 ? 'default' : 'outline'}
                        className={cn(
                          'w-6 h-6 rounded-full p-0 flex items-center justify-center',
                          index === 0 && 'bg-yellow-500',
                          index === 1 && 'bg-gray-400',
                          index === 2 && 'bg-amber-600'
                        )}
                      >
                        {index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm">{rating.model}</div>
                        <div className="text-xs text-muted-foreground">{rating.provider}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <div className="font-medium">{Math.round(rating.rating)}</div>
                        <div className="text-xs text-muted-foreground">ELO</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {rating.totalBattles > 0
                            ? `${Math.round((rating.wins / rating.totalBattles) * 100)}%`
                            : '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">Win Rate</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{rating.totalBattles}</div>
                        <div className="text-xs text-muted-foreground">Battles</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {modelRatings.length === 0 && (
        <SettingsEmptyState
          icon={<Trophy className="h-8 w-8 text-muted-foreground" />}
          title="No battles yet"
          description="Start comparing models in the Chat Arena to see rankings here."
        />
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Preferences
        </Button>

        <Button variant="outline" size="sm" onClick={handleImport}>
          <Upload className="h-4 w-4 mr-2" />
          Import Preferences
        </Button>

        <Button variant="outline" size="sm" onClick={resetSettings}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Settings
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all arena data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all battle history, model ratings, and preferences. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAll}>
                {tCommon('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default ArenaSettings;
