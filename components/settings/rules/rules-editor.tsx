"use client";

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';

const RULE_TARGETS = [
  { id: 'cursor', label: 'Cursor (.cursorrules)', path: '.cursorrules' },
  { id: 'windsurf', label: 'Windsurf (.windsurfrules)', path: '.windsurfrules' },
  { id: 'copilot', label: 'GitHub Copilot (.github/copilot-instructions.md)', path: '.github/copilot-instructions.md' },
];

const RULE_TEMPLATES: Record<string, string> = {
  base: `# Working Agreements\n- Respond with concise, actionable steps.\n- Prefer references to files with line numbers.\n- Ask before running long tasks.\n\n# Tools\n- Prefer built-in project scripts.\n- Avoid destructive commands.\n`,
  frontend: `# Frontend Rules\n- Tailwind v4 with cn() utility.\n- Use @/ alias for imports.\n- Avoid generic UI; favor intentional layouts.\n`,
  agent: `# Agent Rules\n- Honor MCP servers when available.\n- Prefer tool calls before free-form answers.\n- Summaries must cite sources.\n`,
};

interface RulesEditorProps {
  onSave?: (path: string, content: string) => Promise<void> | void;
  initialContent?: Record<string, string>;
}

export function RulesEditor({ onSave, initialContent }: RulesEditorProps) {
  const [activeTab, setActiveTab] = useState(RULE_TARGETS[0].id);
  const [contents, setContents] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    RULE_TARGETS.forEach((target) => {
      defaults[target.id] = initialContent?.[target.id] ?? RULE_TEMPLATES.base;
    });
    return defaults;
  });
  const [selectedTemplate, setSelectedTemplate] = useState('base');

  // Sync contents with initialContent when it changes
  // Using a ref to track if this is the initial render
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (initialContent) {
      // Merge incoming content without triggering cascading renders
      const newContents = { ...contents };
      let hasChanges = false;
      for (const key in initialContent) {
        if (newContents[key] !== initialContent[key]) {
          newContents[key] = initialContent[key];
          hasChanges = true;
        }
      }
      if (hasChanges) {
        setContents(newContents);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  const handleApplyTemplate = () => {
    setContents((prev) => ({ ...prev, [activeTab]: RULE_TEMPLATES[selectedTemplate] }));
  };

  const handleSave = async () => {
    const target = RULE_TARGETS.find((t) => t.id === activeTab);
    if (!target) return;
    try {
      await onSave?.(target.path, contents[activeTab] || '');
      toast.success(`Saved ${target.path}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save rules file');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(contents[activeTab] || '');
    toast.success('Copied to clipboard');
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-4">
        <div>
          <CardTitle>IDE Rules</CardTitle>
          <CardDescription>Manage Cursor/Windsurf/Copilot instruction files.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Choose template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base">Base</SelectItem>
              <SelectItem value="frontend">Frontend</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleApplyTemplate}>Apply</Button>
          <Button variant="outline" onClick={handleCopy}>Copy</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {RULE_TARGETS.map((target) => (
              <TabsTrigger key={target.id} value={target.id}>
                {target.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {RULE_TARGETS.map((target) => (
            <TabsContent key={target.id} value={target.id} className="mt-4">
              <Textarea
                className="min-h-[280px] font-mono"
                value={contents[target.id] ?? ''}
                onChange={(e) =>
                  setContents((prev) => ({ ...prev, [target.id]: e.target.value }))
                }
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
