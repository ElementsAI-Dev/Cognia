'use client';

/**
 * SettingsProfiles - Manage appearance settings profiles
 * Save and load different appearance configurations
 */

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Save,
  FolderOpen,
  Trash2,
  Copy,
  Download,
  Upload,
  Check,
  AlertCircle,
  Plus,
  MoreVertical,
  Layers,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettingsStore } from '@/stores';
import { useSettingsProfilesStore, type SettingsProfile } from '@/stores/settings/settings-profiles-store';
import { cn } from '@/lib/utils';

export function SettingsProfiles() {
  const t = useTranslations('settingsProfilesSettings');
  const tc = useTranslations('common');

  // Current settings from store
  const theme = useSettingsStore((state) => state.theme);
  const colorTheme = useSettingsStore((state) => state.colorTheme);
  const customThemes = useSettingsStore((state) => state.customThemes);
  const activeCustomThemeId = useSettingsStore((state) => state.activeCustomThemeId);
  const backgroundSettings = useSettingsStore((state) => state.backgroundSettings);
  const uiCustomization = useSettingsStore((state) => state.uiCustomization);
  const messageBubbleStyle = useSettingsStore((state) => state.messageBubbleStyle);
  const uiFontSize = useSettingsStore((state) => state.uiFontSize);

  // Settings setters
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setColorTheme = useSettingsStore((state) => state.setColorTheme);
  const createCustomTheme = useSettingsStore((state) => state.createCustomTheme);
  const deleteCustomTheme = useSettingsStore((state) => state.deleteCustomTheme);
  const setActiveCustomTheme = useSettingsStore((state) => state.setActiveCustomTheme);
  const setBackgroundSettings = useSettingsStore((state) => state.setBackgroundSettings);
  const setUICustomization = useSettingsStore((state) => state.setUICustomization);
  const setMessageBubbleStyle = useSettingsStore((state) => state.setMessageBubbleStyle);
  const setUIFontSize = useSettingsStore((state) => state.setUIFontSize);

  // Profiles store
  const profiles = useSettingsProfilesStore((state) => state.profiles);
  const activeProfileId = useSettingsProfilesStore((state) => state.activeProfileId);
  const createProfile = useSettingsProfilesStore((state) => state.createProfile);
  const updateProfile = useSettingsProfilesStore((state) => state.updateProfile);
  const deleteProfile = useSettingsProfilesStore((state) => state.deleteProfile);
  const duplicateProfile = useSettingsProfilesStore((state) => state.duplicateProfile);
  const setActiveProfile = useSettingsProfilesStore((state) => state.setActiveProfile);
  const exportProfile = useSettingsProfilesStore((state) => state.exportProfile);
  const importProfile = useSettingsProfilesStore((state) => state.importProfile);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;

    const profileId = createProfile(newProfileName.trim(), newProfileDescription.trim() || undefined);

    // Save current settings to the new profile
    updateProfile(profileId, {
      theme,
      colorTheme,
      activeCustomThemeId,
      customThemes,
      backgroundSettings,
      uiCustomization,
      messageBubbleStyle,
      uiFontSize,
    });

    setNewProfileName('');
    setNewProfileDescription('');
    setDialogOpen(false);
  };

  const handleLoadProfile = (profile: SettingsProfile) => {
    // Apply profile settings to the store
    setTheme(profile.theme);
    setColorTheme(profile.colorTheme);

    // Sync custom themes: delete all current, then add from profile
    customThemes.forEach((t) => deleteCustomTheme(t.id));
    const themeIdMap = new Map<string, string>();
    profile.customThemes.forEach((t) => {
      const newThemeId = createCustomTheme({ name: t.name, colors: t.colors, isDark: t.isDark });
      themeIdMap.set(t.id, newThemeId);
    });

    const mappedActiveCustomThemeId = profile.activeCustomThemeId
      ? themeIdMap.get(profile.activeCustomThemeId) ?? null
      : null;
    setActiveCustomTheme(mappedActiveCustomThemeId);

    setBackgroundSettings(profile.backgroundSettings);
    setUICustomization(profile.uiCustomization);
    setMessageBubbleStyle(profile.messageBubbleStyle);
    setUIFontSize(profile.uiFontSize);
    setActiveProfile(profile.id);
  };

  const handleSaveToProfile = (profileId: string) => {
    updateProfile(profileId, {
      theme,
      colorTheme,
      activeCustomThemeId,
      customThemes,
      backgroundSettings,
      uiCustomization,
      messageBubbleStyle,
      uiFontSize,
    });
  };

  const handleExportProfile = (profileId: string) => {
    const json = exportProfile(profileId);
    if (!json) return;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const profile = profiles.find((p) => p.id === profileId);
    link.download = `cognia-profile-${profile?.name || 'profile'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportProfile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = importProfile(content);

      if (result.success) {
        setImportStatus('success');
        setImportMessage(t('importSuccess'));
      } else {
        setImportStatus('error');
        setImportMessage(result.error || t('importFailed'));
      }

      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage('');
      }, 3000);
    };

    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDuplicateProfile = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    duplicateProfile(profileId, `${profile.name} (Copy)`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">
                {t('title')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('description')}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportProfile}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3 w-3 mr-1" />
              {t('import')}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  {t('new')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>
                    {t('newProfile')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('newProfileDesc')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name" className="text-xs">
                      {t('profileName')}
                    </Label>
                    <Input
                      id="profile-name"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      placeholder={t('profileNamePlaceholder')}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-description" className="text-xs">
                      {t('descriptionLabel')}
                    </Label>
                    <Input
                      id="profile-description"
                      value={newProfileDescription}
                      onChange={(e) => setNewProfileDescription(e.target.value)}
                      placeholder={t('descriptionPlaceholder')}
                      className="h-8"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {tc('cancel')}
                  </Button>
                  <Button onClick={handleCreateProfile} disabled={!newProfileName.trim()}>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    {t('save')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Import Status */}
        {importStatus !== 'idle' && (
          <Alert
            variant={importStatus === 'error' ? 'destructive' : 'default'}
            className="py-2"
          >
            {importStatus === 'success' ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription className="text-xs">
              {importMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Profiles List */}
        {profiles.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            {t('noSavedProfiles')}
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2 pr-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-colors',
                    activeProfileId === profile.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted/50 hover:bg-muted'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{profile.name}</span>
                      {activeProfileId === profile.id && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                          {t('active')}
                        </Badge>
                      )}
                    </div>
                    {profile.description && (
                      <p className="text-xs text-muted-foreground truncate">{profile.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {t('updated')}{' '}
                      {new Date(profile.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleLoadProfile(profile)}
                    >
                      <FolderOpen className="h-3 w-3 mr-1" />
                      {t('load')}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSaveToProfile(profile.id)}>
                          <Save className="h-3.5 w-3.5 mr-2" />
                          {t('saveCurrent')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateProfile(profile.id)}>
                          <Copy className="h-3.5 w-3.5 mr-2" />
                          {t('duplicate')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportProfile(profile.id)}>
                          <Download className="h-3.5 w-3.5 mr-2" />
                          {t('export')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteProfile(profile.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default SettingsProfiles;
