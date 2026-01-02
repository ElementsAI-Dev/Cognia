'use client';

/**
 * Clipboard Templates Panel
 *
 * Manages clipboard templates with variable substitution,
 * categories, and quick insertion.
 */

import { useState, useMemo } from 'react';
import { useClipboardContext, type ClipboardTemplate } from '@/hooks/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Plus,
  Search,
  FileText,
  Copy,
  Trash2,
  Edit,
  MoreVertical,
  Tag,
  Variable,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClipboardTemplatesPanelProps {
  className?: string;
}

interface TemplateFormData {
  name: string;
  description: string;
  content: string;
  category: string;
  tags: string;
}

const DEFAULT_TEMPLATES: Omit<ClipboardTemplate, 'id' | 'createdAt' | 'usageCount'>[] = [
  {
    name: 'Email Signature',
    description: 'Professional email signature',
    content: `Best regards,
{{name}}
{{title}}
{{company}}
{{email}} | {{phone}}`,
    variables: ['name', 'title', 'company', 'email', 'phone'],
    category: 'email',
    tags: ['email', 'signature', 'professional'],
  },
  {
    name: 'Meeting Response',
    description: 'Quick meeting acceptance',
    content: `Hi {{recipient}},

Thank you for the invitation. I confirm my attendance for the meeting on {{date}} at {{time}}.

Looking forward to it.

Best,
{{name}}`,
    variables: ['recipient', 'date', 'time', 'name'],
    category: 'email',
    tags: ['email', 'meeting', 'response'],
  },
  {
    name: 'Code Comment Block',
    description: 'Documentation comment block',
    content: `/**
 * {{description}}
 *
 * @param {{param}} - {{paramDesc}}
 * @returns {{returnType}} - {{returnDesc}}
 */`,
    variables: ['description', 'param', 'paramDesc', 'returnType', 'returnDesc'],
    category: 'code',
    tags: ['code', 'documentation', 'jsdoc'],
  },
  {
    name: 'Git Commit',
    description: 'Conventional commit message',
    content: `{{type}}({{scope}}): {{subject}}

{{body}}

{{footer}}`,
    variables: ['type', 'scope', 'subject', 'body', 'footer'],
    category: 'git',
    tags: ['git', 'commit', 'conventional'],
  },
  {
    name: 'Bug Report',
    description: 'Bug report template',
    content: `## Bug Description
{{description}}

## Steps to Reproduce
1. {{step1}}
2. {{step2}}
3. {{step3}}

## Expected Behavior
{{expected}}

## Actual Behavior
{{actual}}

## Environment
- OS: {{os}}
- Browser: {{browser}}
- Version: {{version}}`,
    variables: ['description', 'step1', 'step2', 'step3', 'expected', 'actual', 'os', 'browser', 'version'],
    category: 'documentation',
    tags: ['bug', 'report', 'template'],
  },
];

export function ClipboardTemplatesPanel({ className }: ClipboardTemplatesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ClipboardTemplate | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState<ClipboardTemplate | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  const {
    templates,
    addTemplate,
    removeTemplate,
    updateTemplate,
    applyTemplate,
    searchTemplates,
  } = useClipboardContext();

  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    content: '',
    category: '',
    tags: '',
  });

  // Extract variables from content
  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = content.matchAll(regex);
    return [...new Set([...matches].map((m) => m[1]))];
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category).filter((c): c is string => Boolean(c)));
    return [...cats];
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let result = templates;

    if (searchQuery) {
      result = searchTemplates(searchQuery);
    }

    if (selectedCategory) {
      result = result.filter((t) => t.category === selectedCategory);
    }

    return result;
  }, [templates, searchQuery, selectedCategory, searchTemplates]);

  // Initialize default templates if empty
  const initializeDefaults = () => {
    DEFAULT_TEMPLATES.forEach((template) => {
      addTemplate(template);
    });
  };

  // Handle form submission
  const handleSubmit = () => {
    const variables = extractVariables(formData.content);
    const tags = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);

    if (editingTemplate) {
      updateTemplate(editingTemplate.id, {
        name: formData.name,
        description: formData.description,
        content: formData.content,
        category: formData.category,
        tags,
        variables,
      });
    } else {
      addTemplate({
        name: formData.name,
        description: formData.description,
        content: formData.content,
        category: formData.category,
        tags,
        variables,
      });
    }

    resetForm();
    setIsCreateDialogOpen(false);
    setEditingTemplate(null);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      content: '',
      category: '',
      tags: '',
    });
  };

  // Open edit dialog
  const openEditDialog = (template: ClipboardTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      content: template.content,
      category: template.category || '',
      tags: template.tags.join(', '),
    });
    setIsCreateDialogOpen(true);
  };

  // Apply template with variables
  const handleApplyTemplate = async () => {
    if (!applyingTemplate) return;

    await applyTemplate(applyingTemplate.id, variableValues);
    setApplyingTemplate(null);
    setVariableValues({});
  };

  // Quick apply (without variable substitution)
  const quickApply = async (template: ClipboardTemplate) => {
    if (template.variables.length > 0) {
      setApplyingTemplate(template);
      setVariableValues({});
    } else {
      await applyTemplate(template.id);
    }
  };

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
      <div className="flex items-center justify-between p-2 sm:p-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <span className="font-medium">Templates</span>
          <Badge variant="secondary" className="text-xs">
            {templates.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {templates.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={initializeDefaults}
              className="text-xs"
            >
              Load Defaults
            </Button>
          )}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? 'Edit Template' : 'Create Template'}
                </DialogTitle>
                <DialogDescription>
                  Create reusable text snippets with variable placeholders.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Template name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Use {{variable}} for placeholders"
                    className="min-h-[150px] font-mono text-sm"
                  />
                  {formData.content && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {extractVariables(formData.content).map((v) => (
                        <Badge key={v} variant="outline" className="text-xs">
                          <Variable className="h-3 w-3 mr-1" />
                          {v}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., email, code"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="Comma separated"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingTemplate(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.name || !formData.content}>
                  {editingTemplate ? 'Save Changes' : 'Create Template'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-2 border-b shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-8 h-8 text-sm"
          />
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Button
              variant={selectedCategory === null ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 text-xs"
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat ?? null)}
              >
                <FolderOpen className="h-3 w-3 mr-1" />
                {cat}
              </Button>
            ))}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-2">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => (
              <Card key={template.id} className="group">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">{template.name}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => quickApply(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Apply
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(template)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => removeTemplate(template.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  {template.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {template.description}
                    </p>
                  )}
                  <div className="p-2 rounded bg-muted/50 text-xs font-mono max-h-20 overflow-hidden">
                    {template.content.slice(0, 150)}
                    {template.content.length > 150 && '...'}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {template.variables.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Variable className="h-3 w-3 mr-1" />
                          {template.variables.length} vars
                        </Badge>
                      )}
                      {template.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => quickApply(template)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Use
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={FileText}
              title="No templates"
              description={templates.length === 0 ? "Create templates for quick text insertion" : "No templates match your search"}
              compact
            />
          )}
        </div>
      </ScrollArea>

      <Dialog open={!!applyingTemplate} onOpenChange={() => setApplyingTemplate(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Apply Template</DialogTitle>
            <DialogDescription>
              Fill in the template variables.
            </DialogDescription>
          </DialogHeader>
          {applyingTemplate && (
            <div className="grid gap-3 py-4 max-h-[300px] overflow-auto">
              {applyingTemplate.variables.map((variable) => (
                <div key={variable} className="grid gap-1">
                  <Label htmlFor={variable} className="text-sm">
                    {variable}
                  </Label>
                  <Input
                    id={variable}
                    value={variableValues[variable] || ''}
                    onChange={(e) =>
                      setVariableValues({ ...variableValues, [variable]: e.target.value })
                    }
                    placeholder={`Enter ${variable}`}
                    className="h-8"
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyingTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleApplyTemplate}>
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ClipboardTemplatesPanel;
