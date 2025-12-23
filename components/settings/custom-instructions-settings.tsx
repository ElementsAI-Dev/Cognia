'use client';

/**
 * CustomInstructionsSettings - Configure global custom instructions
 * Similar to ChatGPT's "Custom Instructions" feature
 */

import { useState } from 'react';
import { User, MessageSquare, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSettingsStore } from '@/stores';

export function CustomInstructionsSettings() {
  const customInstructions = useSettingsStore((state) => state.customInstructions);
  const customInstructionsEnabled = useSettingsStore((state) => state.customInstructionsEnabled);
  const aboutUser = useSettingsStore((state) => state.aboutUser);
  const responsePreferences = useSettingsStore((state) => state.responsePreferences);

  const setCustomInstructions = useSettingsStore((state) => state.setCustomInstructions);
  const setCustomInstructionsEnabled = useSettingsStore((state) => state.setCustomInstructionsEnabled);
  const setAboutUser = useSettingsStore((state) => state.setAboutUser);
  const setResponsePreferences = useSettingsStore((state) => state.setResponsePreferences);

  // Local state for editing
  const [localAboutUser, setLocalAboutUser] = useState(aboutUser);
  const [localResponsePrefs, setLocalResponsePrefs] = useState(responsePreferences);
  const [localCustomInstructions, setLocalCustomInstructions] = useState(customInstructions);
  const [hasChanges, setHasChanges] = useState(false);

  const handleAboutUserChange = (value: string) => {
    setLocalAboutUser(value);
    setHasChanges(true);
  };

  const handleResponsePrefsChange = (value: string) => {
    setLocalResponsePrefs(value);
    setHasChanges(true);
  };

  const handleCustomInstructionsChange = (value: string) => {
    setLocalCustomInstructions(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    setAboutUser(localAboutUser);
    setResponsePreferences(localResponsePrefs);
    setCustomInstructions(localCustomInstructions);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalAboutUser(aboutUser);
    setLocalResponsePrefs(responsePreferences);
    setLocalCustomInstructions(customInstructions);
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      {/* Enable/Disable Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Custom Instructions</CardTitle>
              <CardDescription className="text-xs">
                Customize how AI responds across all conversations
              </CardDescription>
            </div>
            <Switch
              checked={customInstructionsEnabled}
              onCheckedChange={setCustomInstructionsEnabled}
            />
          </div>
        </CardHeader>
      </Card>

      {customInstructionsEnabled && (
        <>
          {/* About User & Response Preferences in grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm">About You</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Share context about yourself for more relevant responses.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Textarea
                  value={localAboutUser}
                  onChange={(e) => handleAboutUserChange(e.target.value)}
                  placeholder="e.g., I'm a React developer who prefers concise explanations..."
                  rows={3}
                  maxLength={1500}
                  className="text-xs"
                />
                <p className="mt-1 text-[10px] text-muted-foreground text-right">
                  {localAboutUser.length}/1500
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Response Style</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Specify preferred format, detail level, or style.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Textarea
                  value={localResponsePrefs}
                  onChange={(e) => handleResponsePrefsChange(e.target.value)}
                  placeholder="e.g., Be direct. Use bullet points. Include code examples."
                  rows={3}
                  maxLength={1500}
                  className="text-xs"
                />
                <p className="mt-1 text-[10px] text-muted-foreground text-right">
                  {localResponsePrefs.length}/1500
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Custom Instructions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Advanced Instructions</CardTitle>
              <CardDescription className="text-xs">
                Additional system-level instructions
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Textarea
                value={localCustomInstructions}
                onChange={(e) => handleCustomInstructionsChange(e.target.value)}
                placeholder="Enter additional instructions for the AI..."
                rows={4}
                maxLength={2000}
                className="text-xs"
              />
              <p className="mt-1 text-[10px] text-muted-foreground text-right">
                {localCustomInstructions.length}/2000
              </p>
            </CardContent>
          </Card>

          {/* Save/Reset Buttons */}
          {hasChanges && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Discard
              </Button>
              <Button size="sm" onClick={handleSave}>Save</Button>
            </div>
          )}
        </>
      )}

      {/* Preview */}
      {customInstructionsEnabled && (localAboutUser || localResponsePrefs || localCustomInstructions) && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs">Preview</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <pre className="whitespace-pre-wrap text-[10px] bg-muted p-2 rounded-md max-h-32 overflow-auto">
              {[
                localAboutUser && `[User]: ${localAboutUser}`,
                localResponsePrefs && `[Style]: ${localResponsePrefs}`,
                localCustomInstructions && `[Extra]: ${localCustomInstructions}`,
              ]
                .filter(Boolean)
                .join('\n')}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CustomInstructionsSettings;
