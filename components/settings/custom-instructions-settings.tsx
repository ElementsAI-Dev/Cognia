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
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Custom Instructions</CardTitle>
              <CardDescription>
                Customize how AI responds to you across all conversations
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
          {/* About User */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">About You</CardTitle>
                  <CardDescription>
                    What would you like the AI to know about you?
                  </CardDescription>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Share your occupation, interests, expertise level, or any
                        context that helps the AI provide more relevant responses.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={localAboutUser}
                onChange={(e) => handleAboutUserChange(e.target.value)}
                placeholder="e.g., I'm a software developer working primarily with React and TypeScript. I prefer concise explanations with code examples."
                rows={4}
                maxLength={1500}
              />
              <p className="mt-1 text-xs text-muted-foreground text-right">
                {localAboutUser.length}/1500
              </p>
            </CardContent>
          </Card>

          {/* Response Preferences */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Response Preferences</CardTitle>
                  <CardDescription>
                    How would you like the AI to respond?
                  </CardDescription>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Specify your preferred response style, format, level of
                        detail, or any special requirements.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={localResponsePrefs}
                onChange={(e) => handleResponsePrefsChange(e.target.value)}
                placeholder="e.g., Be direct and concise. Use bullet points for lists. Include code examples when relevant. Avoid unnecessary caveats."
                rows={4}
                maxLength={1500}
              />
              <p className="mt-1 text-xs text-muted-foreground text-right">
                {localResponsePrefs.length}/1500
              </p>
            </CardContent>
          </Card>

          {/* Advanced Custom Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Advanced Instructions</CardTitle>
              <CardDescription>
                Additional system-level instructions (combined with the above)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={localCustomInstructions}
                onChange={(e) => handleCustomInstructionsChange(e.target.value)}
                placeholder="Enter any additional instructions for the AI..."
                rows={6}
                maxLength={2000}
              />
              <p className="mt-1 text-xs text-muted-foreground text-right">
                {localCustomInstructions.length}/2000
              </p>
            </CardContent>
          </Card>

          {/* Save/Reset Buttons */}
          {hasChanges && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                Discard Changes
              </Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          )}
        </>
      )}

      {/* Preview */}
      {customInstructionsEnabled && (localAboutUser || localResponsePrefs || localCustomInstructions) && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Preview</CardTitle>
            <CardDescription>
              This is how your instructions will appear to the AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md max-h-48 overflow-auto">
              {[
                localAboutUser && `[About the user]\n${localAboutUser}`,
                localResponsePrefs && `\n[Response preferences]\n${localResponsePrefs}`,
                localCustomInstructions && `\n[Additional instructions]\n${localCustomInstructions}`,
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
