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
  const _t = useTranslations('settings');
  const tc = useTranslations('common');
  const language = useSettingsStore((state) => state.language);

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

  const isZh = language === 'zh-CN';

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
    profile.customThemes.forEach((t) => {
      createCustomTheme({ name: t.name, colors: t.colors, isDark: t.isDark });
    });
    
    if (profile.activeCustomThemeId) {
      setActiveCustomTheme(profile.activeCustomThemeId);
    }
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
        setImportMessage(isZh ? '导入成功' : 'Profile imported successfully');
      } else {
        setImportStatus('error');
        setImportMessage(result.error || (isZh ? '导入失败' : 'Import failed'));
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
                {isZh ? '外观配置' : 'Appearance Profiles'}
              </CardTitle>
              <CardDescription className="text-xs">
                {isZh ? '保存和加载不同的外观配置' : 'Save and load different appearance configurations'}
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
              {isZh ? '导入' : 'Import'}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  {isZh ? '新建' : 'New'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>
                    {isZh ? '新建配置' : 'New Profile'}
                  </DialogTitle>
                  <DialogDescription>
                    {isZh
                      ? '保存当前外观设置为新的配置'
                      : 'Save current appearance settings as a new profile'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name" className="text-xs">
                      {isZh ? '配置名称' : 'Profile Name'}
                    </Label>
                    <Input
                      id="profile-name"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      placeholder={isZh ? '我的外观配置' : 'My Appearance Profile'}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-description" className="text-xs">
                      {isZh ? '描述（可选）' : 'Description (optional)'}
                    </Label>
                    <Input
                      id="profile-description"
                      value={newProfileDescription}
                      onChange={(e) => setNewProfileDescription(e.target.value)}
                      placeholder={isZh ? '暗色主题配置' : 'Dark theme setup'}
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
                    {isZh ? '保存' : 'Save'}
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
          <div
            className={cn(
              'flex items-center gap-2 p-2 rounded-md text-xs',
              importStatus === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
            )}
          >
            {importStatus === 'success' ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5" />
            )}
            {importMessage}
          </div>
        )}

        {/* Profiles List */}
        {profiles.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            {isZh ? '暂无保存的配置' : 'No saved profiles'}
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
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                          {isZh ? '当前' : 'Active'}
                        </span>
                      )}
                    </div>
                    {profile.description && (
                      <p className="text-xs text-muted-foreground truncate">{profile.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {isZh ? '更新于' : 'Updated'}{' '}
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
                      {isZh ? '加载' : 'Load'}
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
                          {isZh ? '保存当前设置' : 'Save Current'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateProfile(profile.id)}>
                          <Copy className="h-3.5 w-3.5 mr-2" />
                          {isZh ? '复制' : 'Duplicate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportProfile(profile.id)}>
                          <Download className="h-3.5 w-3.5 mr-2" />
                          {isZh ? '导出' : 'Export'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteProfile(profile.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          {isZh ? '删除' : 'Delete'}
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
