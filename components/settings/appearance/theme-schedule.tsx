'use client';

/**
 * ThemeSchedule - Automatic theme switching based on time
 * Allows users to set times for automatic light/dark mode switching
 */

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Sun, Moon, Sunrise, Sunset } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useSettingsStore } from '@/stores';

/**
 * Parse time string to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * (Scheduling execution runs globally in the app provider.)
 */

export function ThemeSchedule() {
  const t = useTranslations('settings');
  const language = useSettingsStore((state) => state.language);
  const theme = useSettingsStore((state) => state.theme);
  const schedule = useSettingsStore((state) => state.themeSchedule);
  const setThemeSchedule = useSettingsStore((state) => state.setThemeSchedule);

  const updateSchedule = useCallback(
    (updates: Parameters<typeof setThemeSchedule>[0]) => {
      setThemeSchedule(updates);
    },
    [setThemeSchedule]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <CardTitle>{t('themeSchedule') || 'Theme Schedule'}</CardTitle>
        </div>
        <CardDescription>
          {t('themeScheduleDescription') || 'Automatically switch between light and dark mode'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable Schedule */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t('enableSchedule') || 'Enable Schedule'}</Label>
            <p className="text-xs text-muted-foreground">
              {language === 'zh-CN' 
                ? '根据时间自动切换主题' 
                : 'Automatically switch theme based on time'}
            </p>
          </div>
          <Switch
            checked={schedule.enabled}
            onCheckedChange={(enabled) => updateSchedule({ enabled })}
          />
        </div>

        {theme === 'system' && schedule.enabled && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {language === 'zh-CN'
              ? '提示：当主题设置为“跟随系统”时，定时切换不会生效'
              : 'Note: Schedule will not apply when theme is set to "System"'}
          </p>
        )}

        {schedule.enabled && (
          <>
            {/* Light Mode Start */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Sunrise className="h-3.5 w-3.5 text-amber-500" />
                  {t('lightModeStart') || 'Light Mode Start'}
                </Label>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" />
                  <Input
                    type="time"
                    value={schedule.lightModeStart}
                    onChange={(e) => updateSchedule({ lightModeStart: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Dark Mode Start */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Sunset className="h-3.5 w-3.5 text-indigo-500" />
                  {t('darkModeStart') || 'Dark Mode Start'}
                </Label>
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-500" />
                  <Input
                    type="time"
                    value={schedule.darkModeStart}
                    onChange={(e) => updateSchedule({ darkModeStart: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Visual Timeline */}
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>00:00</span>
                <span>12:00</span>
                <span>24:00</span>
              </div>
              <div className="h-4 rounded-full overflow-hidden flex">
                {(() => {
                  const lightMinutes = parseTimeToMinutes(schedule.lightModeStart);
                  const darkMinutes = parseTimeToMinutes(schedule.darkModeStart);
                  const totalMinutes = 24 * 60;

                  if (lightMinutes < darkMinutes) {
                    // Normal: dark - light - dark
                    return (
                      <>
                        <div
                          className="bg-indigo-500/50"
                          style={{ width: `${(lightMinutes / totalMinutes) * 100}%` }}
                        />
                        <div
                          className="bg-amber-400"
                          style={{ width: `${((darkMinutes - lightMinutes) / totalMinutes) * 100}%` }}
                        />
                        <div
                          className="bg-indigo-500/50"
                          style={{ width: `${((totalMinutes - darkMinutes) / totalMinutes) * 100}%` }}
                        />
                      </>
                    );
                  } else {
                    // Inverted: light - dark - light
                    return (
                      <>
                        <div
                          className="bg-amber-400"
                          style={{ width: `${(darkMinutes / totalMinutes) * 100}%` }}
                        />
                        <div
                          className="bg-indigo-500/50"
                          style={{ width: `${((lightMinutes - darkMinutes) / totalMinutes) * 100}%` }}
                        />
                        <div
                          className="bg-amber-400"
                          style={{ width: `${((totalMinutes - lightMinutes) / totalMinutes) * 100}%` }}
                        />
                      </>
                    );
                  }
                })()}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded bg-amber-400" />
                  <span>{language === 'zh-CN' ? '亮色模式' : 'Light'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded bg-indigo-500/50" />
                  <span>{language === 'zh-CN' ? '暗色模式' : 'Dark'}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ThemeSchedule;
