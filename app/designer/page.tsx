'use client';

/**
 * Designer Page - Standalone V0-style web page designer
 */

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSettingsStore } from '@/stores';
import { generateText } from 'ai';
import { getProviderModel, type ProviderName } from '@/lib/ai/client';
import { ReactSandbox } from '@/components/designer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DESIGNER_TEMPLATES, AI_SUGGESTIONS, TEMPLATE_CATEGORIES } from '@/lib/designer/templates';
import {
  Sparkles,
  Send,
  Loader2,
  ArrowLeft,
  Wand2,
  AlertCircle,
  Layers,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

export default function DesignerPage() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(DESIGNER_TEMPLATES[0].code);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  // Load code from sessionStorage if key parameter is present
  useEffect(() => {
    const key = searchParams.get('key');
    if (key) {
      const storedCode = sessionStorage.getItem(key);
      if (storedCode) {
        setCode(storedCode);
        setShowTemplates(false);
        // Clean up after reading
        sessionStorage.removeItem(key);
      }
    }
  }, [searchParams]);

  const handleSelectTemplate = useCallback((template: typeof DESIGNER_TEMPLATES[0]) => {
    setCode(template.code);
    setShowTemplates(false);
  }, []);

  const handleAIEdit = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    
    setIsAIProcessing(true);
    setAIError(null);

    const provider = (defaultProvider || 'openai') as ProviderName;
    const settings = providerSettings[provider];
    const model = settings?.defaultModel || 'gpt-4o-mini';

    if (!settings?.apiKey && provider !== 'ollama') {
      setAIError(`No API key configured for ${provider}. Please add your API key in Settings.`);
      setIsAIProcessing(false);
      return;
    }

    try {
      const modelInstance = getProviderModel(provider, model, settings?.apiKey || '', settings?.baseURL);

      const result = await generateText({
        model: modelInstance,
        system: `You are an expert React developer. Modify the following React component based on the user's request.
Return ONLY the complete modified code, no explanations.
Preserve the component structure and use Tailwind CSS for styling.
Make sure the code is valid JSX that can be rendered.`,
        prompt: `Current code:\n\n${code}\n\nUser request: ${aiPrompt}`,
        temperature: 0.7,
      });

      if (result.text) {
        // Clean up the response - remove markdown code blocks if present
        let newCode = result.text.trim();
        if (newCode.startsWith('```')) {
          newCode = newCode.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
        }
        setCode(newCode);
      }
      setAIPrompt('');
    } catch (error) {
      setAIError(error instanceof Error ? error.message : 'AI edit failed');
    } finally {
      setIsAIProcessing(false);
    }
  }, [aiPrompt, code, defaultProvider, providerSettings]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <Wand2 className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-medium text-sm">Designer</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
            <Layers className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button
            variant={showAIPanel ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowAIPanel(!showAIPanel)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Edit
          </Button>
        </div>
      </header>

      {/* AI Panel */}
      {showAIPanel && (
        <div className="border-b p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAIPrompt(e.target.value)}
                placeholder="Describe what you want to change..."
                className="min-h-[60px] resize-none text-sm"
                disabled={isAIProcessing}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {AI_SUGGESTIONS.slice(0, 4).map((suggestion) => (
                  <Badge
                    key={suggestion}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted text-xs"
                    onClick={() => setAIPrompt(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
              {aiError && (
                <div className="flex items-center gap-2 mt-2 text-destructive text-xs">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{aiError}</span>
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={handleAIEdit}
                disabled={!aiPrompt.trim() || isAIProcessing}
              >
                {isAIProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Generate
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowAIPanel(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ReactSandbox
          code={code}
          onCodeChange={setCode}
          showFileExplorer={false}
          showConsole={false}
        />
      </div>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Start with a pre-built template or create from scratch
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="all" className="flex-1 overflow-hidden flex flex-col">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="Basic">Basic</TabsTrigger>
              <TabsTrigger value="Marketing">Marketing</TabsTrigger>
              <TabsTrigger value="Application">Application</TabsTrigger>
              <TabsTrigger value="Components">Components</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              <TabsContent value="all" className="mt-0">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {DESIGNER_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="group text-left rounded-md border p-3 hover:border-foreground/20 hover:bg-muted/50 transition-colors"
                    >
                      <div className="aspect-video bg-muted rounded mb-2 flex items-center justify-center">
                        <Layers className="h-6 w-6 opacity-20" />
                      </div>
                      <h3 className="text-sm font-medium">
                        {template.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {template.description}
                      </p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {template.category}
                      </Badge>
                    </button>
                  ))}
                </div>
              </TabsContent>

              {TEMPLATE_CATEGORIES.map((category) => (
                <TabsContent key={category} value={category} className="mt-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {DESIGNER_TEMPLATES.filter((t) => t.category === category).map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="group text-left rounded-md border p-3 hover:border-foreground/20 hover:bg-muted/50 transition-colors"
                      >
                        <div className="aspect-video bg-muted rounded mb-2 flex items-center justify-center">
                          <Layers className="h-6 w-6 opacity-20" />
                        </div>
                        <h3 className="text-sm font-medium">
                          {template.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {template.description}
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {template.category}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
