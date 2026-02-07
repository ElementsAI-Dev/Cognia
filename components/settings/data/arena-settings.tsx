'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Swords,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Trophy,
  BarChart3,
  Shield,
  Settings2,
  ChevronDown,
  ChevronUp,
  FileJson,
  AlertTriangle,
} from 'lucide-react';

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
import { Input } from '@/components/ui/input';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useArenaStore } from '@/stores/arena';
import { exportPreferences, importPreferences } from '@/lib/ai/generation/preference-learner';
import {
  exportBattles,
  getExportStats,
  downloadExport,
  type ExportFormat,
} from '@/lib/ai/arena/rlhf-export';
import { useLeaderboardSyncSettings } from '@/hooks/arena';
import { toast } from 'sonner';
import type { ArenaPreference, ArenaModelRating } from '@/types/arena';

export function ArenaSettings() {
  const t = useTranslations('arena.settings');
  const tArena = useTranslations('arena');
  const tCommon = useTranslations('common');
  // Collapsible state
  const [showAntiGaming, setShowAntiGaming] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLeaderboardSync, setShowLeaderboardSync] = useState(false);
  const [showRlhfExport, setShowRlhfExport] = useState(false);
  const [rlhfFormat, setRlhfFormat] = useState<ExportFormat>('rlhf');

  // Arena store
  const settings = useArenaStore((state) => state.settings);
  const updateSettings = useArenaStore((state) => state.updateSettings);
  const resetSettings = useArenaStore((state) => state.resetSettings);
  const battles = useArenaStore((state) => state.battles);
  const modelRatings = useArenaStore((state) => state.modelRatings);
  const clearBattleHistory = useArenaStore((state) => state.clearBattleHistory);
  const resetModelRatings = useArenaStore((state) => state.resetModelRatings);
  const clearPreferences = useArenaStore((state) => state.clearPreferences);
  const getStats = useArenaStore((state) => state.getStats);

  const {
    settings: syncSettings,
    updateSettings: updateSyncSettings,
  } = useLeaderboardSyncSettings();

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

  // Import preferences from JSON file with validation
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

        // Validate structure
        if (!data.preferences || !Array.isArray(data.preferences)) {
          toast.error(t('importFailed'), {
            description: t('importInvalidFormat'),
          });
          return;
        }

        // Validate each preference has required fields
        const isValid = data.preferences.every(
          (p: Partial<ArenaPreference>) =>
            p.id && p.battleId && p.winner && p.loser && p.timestamp
        );

        if (!isValid) {
          toast.error(t('importFailed'), {
            description: t('importInvalidPreferences'),
          });
          return;
        }

        // Optional: validate modelRatings if present
        if (data.modelRatings && Array.isArray(data.modelRatings)) {
          const ratingsValid = data.modelRatings.every(
            (r: Partial<ArenaModelRating>) =>
              r.modelId && r.provider && r.model && typeof r.rating === 'number'
          );
          if (!ratingsValid) {
            toast.error(t('importFailed'), {
              description: t('importInvalidRatings'),
            });
            return;
          }
        }

        importPreferences(data);
        toast.success(t('importSuccess'), {
          description: t('importSuccessDescription', { count: data.preferences.length }),
        });
      } catch (err) {
        console.error('Failed to import preferences:', err);
        toast.error(t('importFailed'), {
          description: t('importParseError'),
        });
      }
    };
    input.click();
  };

  // RLHF export
  const rlhfStats = getExportStats(battles);

  const handleRlhfExport = () => {
    const data = exportBattles(battles, {
      format: rlhfFormat,
      includeMetadata: true,
      includeTies: false,
    });
    const filename = `arena-rlhf-${rlhfFormat}-${new Date().toISOString().split('T')[0]}`;
    downloadExport(data, filename, rlhfFormat);
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
          description={t('autoSelectDescription')}
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
          description={t('defaultModeDescription')}
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

        {/* Default Conversation Mode - NEW */}
        <SettingsCard
          title={t('conversationMode')}
          description={t('conversationModeDescription')}
        >
          <Select
            value={settings.defaultConversationMode}
            onValueChange={(value) =>
              updateSettings({ defaultConversationMode: value as 'single' | 'multi' })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">{t('singleTurn')}</SelectItem>
              <SelectItem value="multi">{t('multiTurn')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingsCard>

        {/* Default Max Turns - NEW */}
        <SettingsCard
          title={t('maxTurns')}
          description={`${settings.defaultMaxTurns} ${t('maxTurnsDescription')}`}
        >
          <div className="w-32">
            <Slider
              value={[settings.defaultMaxTurns]}
              onValueChange={([value]) => updateSettings({ defaultMaxTurns: value })}
              min={2}
              max={20}
              step={1}
            />
          </div>
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
          description={t('showCostDescription')}
        >
          <Switch
            checked={settings.showCostEstimates}
            onCheckedChange={(checked) => updateSettings({ showCostEstimates: checked })}
          />
        </SettingsCard>

        {/* Show Token Counts */}
        <SettingsCard
          title={t('showTokens')}
          description={t('showTokensDescription')}
        >
          <Switch
            checked={settings.showTokenCounts}
            onCheckedChange={(checked) => updateSettings({ showTokenCounts: checked })}
          />
        </SettingsCard>

        {/* Show Confidence Intervals - NEW */}
        <SettingsCard
          title={t('showConfidenceIntervals')}
          description={t('showConfidenceIntervalsDescription')}
        >
          <Switch
            checked={settings.showConfidenceIntervals}
            onCheckedChange={(checked) => updateSettings({ showConfidenceIntervals: checked })}
          />
        </SettingsCard>
      </SettingsGrid>

      {/* Global Leaderboard Sync */}
      <Collapsible open={showLeaderboardSync} onOpenChange={setShowLeaderboardSync}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <span className="font-semibold">{tArena('leaderboard.sync.title')}</span>
            </div>
            {showLeaderboardSync ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SettingsGrid className="pt-2">
            <SettingsCard
              title={tArena('leaderboard.sync.enabled')}
              description={tArena('leaderboard.sync.enabledDescription')}
            >
              <Switch
                checked={syncSettings.enabled}
                onCheckedChange={(checked) => {
                  updateSyncSettings({ enabled: checked });
                  updateSettings({ enableLeaderboardSync: checked });
                }}
              />
            </SettingsCard>

            <SettingsCard
              title={tArena('leaderboard.sync.showGlobalLeaderboard')}
              description={tArena('leaderboard.sync.showGlobalLeaderboardDescription')}
            >
              <Switch
                checked={settings.showGlobalLeaderboard}
                onCheckedChange={(checked) => updateSettings({ showGlobalLeaderboard: checked })}
                disabled={!syncSettings.enabled}
              />
            </SettingsCard>

            <SettingsCard
              title={tArena('leaderboard.sync.apiUrl')}
              description={tArena('leaderboard.sync.apiUrlPlaceholder')}
            >
              <Input
                value={syncSettings.apiBaseUrl}
                onChange={(event) => updateSyncSettings({ apiBaseUrl: event.target.value })}
                placeholder={tArena('leaderboard.sync.apiUrlPlaceholder')}
                disabled={!syncSettings.enabled}
              />
            </SettingsCard>

            <SettingsCard title={tArena('leaderboard.sync.apiKey')}>
              <Input
                type="password"
                value={syncSettings.apiKey ?? ''}
                onChange={(event) => updateSyncSettings({ apiKey: event.target.value || undefined })}
                disabled={!syncSettings.enabled}
              />
            </SettingsCard>

            <SettingsCard
              title={tArena('leaderboard.sync.autoSubmit')}
              description={tArena('leaderboard.sync.autoSubmitDescription')}
            >
              <Switch
                checked={syncSettings.autoSubmitPreferences}
                onCheckedChange={(checked) => updateSyncSettings({ autoSubmitPreferences: checked })}
                disabled={!syncSettings.enabled}
              />
            </SettingsCard>

            <SettingsCard
              title={tArena('leaderboard.sync.autoRefresh')}
              description={tArena('leaderboard.sync.autoRefreshDescription')}
            >
              <Switch
                checked={syncSettings.autoRefresh}
                onCheckedChange={(checked) => updateSyncSettings({ autoRefresh: checked })}
                disabled={!syncSettings.enabled}
              />
            </SettingsCard>

            <SettingsCard
              title={tArena('leaderboard.sync.refreshInterval')}
              description={`${syncSettings.autoRefreshIntervalMinutes} min`}
            >
              <div className="w-32">
                <Slider
                  value={[syncSettings.autoRefreshIntervalMinutes]}
                  onValueChange={([value]) => updateSyncSettings({ autoRefreshIntervalMinutes: value })}
                  min={1}
                  max={60}
                  step={1}
                  disabled={!syncSettings.enabled || !syncSettings.autoRefresh}
                />
              </div>
            </SettingsCard>

            <SettingsCard
              title={tArena('leaderboard.sync.cacheDuration')}
              description={`${syncSettings.cacheDurationMinutes} min`}
            >
              <div className="w-32">
                <Slider
                  value={[syncSettings.cacheDurationMinutes]}
                  onValueChange={([value]) => updateSyncSettings({ cacheDurationMinutes: value })}
                  min={1}
                  max={60}
                  step={1}
                  disabled={!syncSettings.enabled}
                />
              </div>
            </SettingsCard>

            <SettingsCard
              title={tArena('leaderboard.sync.minBattles')}
              description={`${syncSettings.minBattlesThreshold}`}
            >
              <div className="w-32">
                <Slider
                  value={[syncSettings.minBattlesThreshold]}
                  onValueChange={([value]) => updateSyncSettings({ minBattlesThreshold: value })}
                  min={1}
                  max={50}
                  step={1}
                  disabled={!syncSettings.enabled}
                />
              </div>
            </SettingsCard>

            <SettingsCard
              title={tArena('leaderboard.sync.anonymousMode')}
              description={tArena('leaderboard.sync.anonymousModeDescription')}
            >
              <Switch
                checked={syncSettings.anonymousMode}
                onCheckedChange={(checked) => updateSyncSettings({ anonymousMode: checked })}
                disabled={!syncSettings.enabled}
              />
            </SettingsCard>

            <SettingsCard
              title={tArena('leaderboard.sync.retryFailedSubmissions')}
              description={tArena('leaderboard.sync.retryFailedSubmissionsDescription')}
            >
              <Switch
                checked={syncSettings.retryFailedSubmissions}
                onCheckedChange={(checked) => updateSyncSettings({ retryFailedSubmissions: checked })}
                disabled={!syncSettings.enabled}
              />
            </SettingsCard>

            <SettingsCard
              title={tArena('leaderboard.sync.maxRetryAttempts')}
              description={`${syncSettings.maxRetryAttempts}`}
            >
              <div className="w-32">
                <Slider
                  value={[syncSettings.maxRetryAttempts]}
                  onValueChange={([value]) => updateSyncSettings({ maxRetryAttempts: value })}
                  min={1}
                  max={10}
                  step={1}
                  disabled={!syncSettings.enabled || !syncSettings.retryFailedSubmissions}
                />
              </div>
            </SettingsCard>

            <SettingsCard
              title={tArena('leaderboard.sync.requestTimeout')}
              description={`${Math.round(syncSettings.requestTimeoutMs / 1000)}s`}
            >
              <div className="w-32">
                <Slider
                  value={[Math.round(syncSettings.requestTimeoutMs / 1000)]}
                  onValueChange={([value]) => updateSyncSettings({ requestTimeoutMs: value * 1000 })}
                  min={5}
                  max={120}
                  step={5}
                  disabled={!syncSettings.enabled}
                />
              </div>
            </SettingsCard>
          </SettingsGrid>
        </CollapsibleContent>
      </Collapsible>

      {/* Anti-Gaming Settings - NEW */}
      <Collapsible open={showAntiGaming} onOpenChange={setShowAntiGaming}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="font-semibold">{t('antiGaming')}</span>
            </div>
            {showAntiGaming ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SettingsGrid className="pt-2">
            <SettingsCard
              title={t('enableAntiGaming')}
              description={t('enableAntiGamingDescription')}
            >
              <Switch
                checked={settings.enableAntiGaming}
                onCheckedChange={(checked) => updateSettings({ enableAntiGaming: checked })}
              />
            </SettingsCard>

            <SettingsCard
              title={t('maxVotesPerHour')}
              description={`${settings.maxVotesPerHour} votes/hour`}
            >
              <div className="w-32">
                <Slider
                  value={[settings.maxVotesPerHour]}
                  onValueChange={([value]) => updateSettings({ maxVotesPerHour: value })}
                  min={5}
                  max={100}
                  step={5}
                  disabled={!settings.enableAntiGaming}
                />
              </div>
            </SettingsCard>

            <SettingsCard
              title={t('minViewingTime')}
              description={t('minViewingTimeDescription')}
            >
              <div className="w-32">
                <Slider
                  value={[settings.minViewingTimeMs / 1000]}
                  onValueChange={([value]) => updateSettings({ minViewingTimeMs: value * 1000 })}
                  min={1}
                  max={30}
                  step={1}
                  disabled={!settings.enableAntiGaming}
                />
              </div>
            </SettingsCard>
          </SettingsGrid>
        </CollapsibleContent>
      </Collapsible>

      {/* Advanced Settings - NEW */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              <span className="font-semibold">{t('advancedSettings')}</span>
            </div>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SettingsGrid className="pt-2">
            <SettingsCard
              title={t('bootstrapSamples')}
              description={`${settings.bootstrapSamples} ${t('bootstrapSamplesDescription')}`}
            >
              <div className="w-32">
                <Slider
                  value={[settings.bootstrapSamples]}
                  onValueChange={([value]) => updateSettings({ bootstrapSamples: value })}
                  min={100}
                  max={5000}
                  step={100}
                />
              </div>
            </SettingsCard>
          </SettingsGrid>
        </CollapsibleContent>
      </Collapsible>

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
            <div className="text-sm text-muted-foreground">{t('modelsRated')}</div>
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
          title={t('noBattlesYet')}
          description={t('noBattlesDescription')}
        />
      )}

      {/* RLHF Export */}
      <Collapsible open={showRlhfExport} onOpenChange={setShowRlhfExport}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto">
            <div className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              <span className="font-semibold">{t('rlhfExport')}</span>
            </div>
            {showRlhfExport ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 p-4">
            {/* Export Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xl font-bold">{rlhfStats.totalBattles}</div>
                <div className="text-xs text-muted-foreground">{t('rlhfTotalBattles')}</div>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xl font-bold">{rlhfStats.validPairs}</div>
                <div className="text-xs text-muted-foreground">{t('rlhfValidPairs')}</div>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xl font-bold">{Math.round(rlhfStats.avgPromptLength)}</div>
                <div className="text-xs text-muted-foreground">{t('rlhfAvgPromptLen')}</div>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xl font-bold">{Math.round(rlhfStats.avgResponseLength)}</div>
                <div className="text-xs text-muted-foreground">{t('rlhfAvgResponseLen')}</div>
              </div>
            </div>

            {/* Category Distribution */}
            {Object.keys(rlhfStats.byCategory).length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">{t('rlhfByCategory')}</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(rlhfStats.byCategory).map(([cat, count]) => (
                    <Badge key={cat} variant="outline" className="text-xs">
                      {cat}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {rlhfStats.validPairs === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {t('rlhfNoValidPairs')}
              </div>
            )}

            {/* Format Selection + Export */}
            <div className="flex items-center gap-3">
              <Select value={rlhfFormat} onValueChange={(v) => setRlhfFormat(v as ExportFormat)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rlhf">RLHF JSON</SelectItem>
                  <SelectItem value="dpo">DPO</SelectItem>
                  <SelectItem value="hh-rlhf">HH-RLHF</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="jsonl">JSONL</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleRlhfExport}
                disabled={rlhfStats.validPairs === 0}
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('rlhfExportButton')}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          {t('exportPreferences')}
        </Button>

        <Button variant="outline" size="sm" onClick={handleImport}>
          <Upload className="h-4 w-4 mr-2" />
          {t('importPreferences')}
        </Button>

        <Button variant="outline" size="sm" onClick={resetSettings}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('resetSettings')}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('clearAllData')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('clearAllTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('clearAllDescription')}
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
