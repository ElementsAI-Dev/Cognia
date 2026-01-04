"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  X,
  Search,
  Star,
  StarOff,
  MoreHorizontal,
  Sparkles,
  Languages,
  FileText,
  Code2,
  PenLine,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

export interface Template {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  category: string;
  icon?: string;
  isFavorite?: boolean;
  usageCount?: number;
  createdAt: number;
  updatedAt: number;
}

interface TemplatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: Template, selectedText: string) => void;
  selectedText?: string;
  className?: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "translate-zh",
    name: "Translate to Chinese",
    description: "Translate text to Simplified Chinese",
    prompt: "Translate the following text to Simplified Chinese:\n\n{{text}}",
    category: "Translation",
    icon: "languages",
    isFavorite: true,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "translate-en",
    name: "Translate to English",
    description: "Translate text to English",
    prompt: "Translate the following text to English:\n\n{{text}}",
    category: "Translation",
    icon: "languages",
    isFavorite: true,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "explain-simple",
    name: "Explain Simply",
    description: "Explain in simple terms",
    prompt: "Explain the following in simple terms that anyone can understand:\n\n{{text}}",
    category: "Explanation",
    icon: "sparkles",
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "summarize-bullets",
    name: "Summarize as Bullets",
    description: "Create bullet point summary",
    prompt: "Summarize the following text as concise bullet points:\n\n{{text}}",
    category: "Summary",
    icon: "file-text",
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "rewrite-formal",
    name: "Rewrite Formally",
    description: "Rewrite in formal tone",
    prompt: "Rewrite the following text in a formal, professional tone:\n\n{{text}}",
    category: "Rewriting",
    icon: "pen-line",
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "rewrite-casual",
    name: "Rewrite Casually",
    description: "Rewrite in casual tone",
    prompt: "Rewrite the following text in a casual, friendly tone:\n\n{{text}}",
    category: "Rewriting",
    icon: "pen-line",
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "code-explain",
    name: "Explain Code",
    description: "Explain code step by step",
    prompt: "Explain this code step by step, including what each part does:\n\n```\n{{text}}\n```",
    category: "Code",
    icon: "code",
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "code-review",
    name: "Code Review",
    description: "Review code for issues",
    prompt: "Review this code and identify potential issues, bugs, or improvements:\n\n```\n{{text}}\n```",
    category: "Code",
    icon: "code",
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "extract-keywords",
    name: "Extract Keywords",
    description: "Extract key terms and concepts",
    prompt: "Extract the key terms, concepts, and important phrases from this text:\n\n{{text}}",
    category: "Analysis",
    icon: "zap",
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "grammar-fix",
    name: "Fix Grammar",
    description: "Fix grammar and spelling",
    prompt: "Fix any grammar, spelling, and punctuation errors in this text. Return only the corrected text:\n\n{{text}}",
    category: "Editing",
    icon: "pen-line",
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  Translation: Languages,
  Explanation: Sparkles,
  Summary: FileText,
  Rewriting: PenLine,
  Code: Code2,
  Analysis: Zap,
  Editing: PenLine,
  Custom: LayoutTemplate,
};

export function TemplatesPanel({
  isOpen,
  onClose,
  onApplyTemplate,
  selectedText = "",
  className,
}: TemplatesPanelProps) {
  const t = useTranslations("templates");
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New template form state
  const [newTemplate, setNewTemplate] = useState<Partial<Template>>({
    name: "",
    description: "",
    prompt: "",
    category: "Custom",
  });

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category));
    return Array.from(cats);
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        searchQuery === "" ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.prompt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === null || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  // Sort: favorites first, then by usage count
  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return (b.usageCount || 0) - (a.usageCount || 0);
    });
  }, [filteredTemplates]);

  const handleApplyTemplate = useCallback(
    (template: Template) => {
      // Update usage count
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === template.id
            ? { ...t, usageCount: (t.usageCount || 0) + 1 }
            : t
        )
      );
      onApplyTemplate(template, selectedText);
    },
    [onApplyTemplate, selectedText]
  );

  const handleToggleFavorite = useCallback((templateId: string) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
      )
    );
  }, []);

  const handleDeleteTemplate = useCallback((templateId: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  }, []);

  const handleCopyPrompt = useCallback((template: Template) => {
    const prompt = template.prompt.replace("{{text}}", selectedText || "[selected text]");
    navigator.clipboard.writeText(prompt);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, [selectedText]);

  const handleCreateTemplate = useCallback(() => {
    if (!newTemplate.name || !newTemplate.prompt) return;

    const template: Template = {
      id: `custom-${Date.now()}`,
      name: newTemplate.name,
      description: newTemplate.description,
      prompt: newTemplate.prompt,
      category: newTemplate.category || "Custom",
      isFavorite: false,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setTemplates((prev) => [...prev, template]);
    setNewTemplate({ name: "", description: "", prompt: "", category: "Custom" });
    setIsCreateDialogOpen(false);
  }, [newTemplate]);

  const handleUpdateTemplate = useCallback(() => {
    if (!editingTemplate) return;

    setTemplates((prev) =>
      prev.map((t) =>
        t.id === editingTemplate.id
          ? { ...editingTemplate, updatedAt: Date.now() }
          : t
      )
    );
    setEditingTemplate(null);
  }, [editingTemplate]);

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "w-[480px] max-h-[600px] z-50",
          "bg-gray-900/95 backdrop-blur-xl",
          "rounded-2xl border border-white/10",
          "shadow-2xl shadow-black/50",
          "animate-in fade-in zoom-in-95 duration-200",
          "flex flex-col overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-white">
              {t("title") || "Prompt Templates"}
            </span>
            <Badge variant="secondary" className="h-5 text-[10px]">
              {templates.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-white/60 hover:text-white gap-1"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/60 hover:text-white"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="px-4 py-2 border-b border-white/10 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-9 text-sm bg-white/5 border-white/10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-2 text-[10px]",
                selectedCategory === null
                  ? "bg-white/10 text-white"
                  : "text-white/60"
              )}
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category] || LayoutTemplate;
              return (
                <Button
                  key={category}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-[10px] gap-1",
                    selectedCategory === category
                      ? "bg-white/10 text-white"
                      : "text-white/60"
                  )}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === category ? null : category
                    )
                  }
                >
                  <Icon className="w-3 h-3" />
                  {category}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Templates List */}
        <ScrollArea className="flex-1 max-h-[380px]">
          <div className="p-2 space-y-1">
            {sortedTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/40">
                <LayoutTemplate className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No templates found</p>
              </div>
            ) : (
              sortedTemplates.map((template) => {
                const CategoryIcon =
                  CATEGORY_ICONS[template.category] || LayoutTemplate;

                return (
                  <div
                    key={template.id}
                    className="group rounded-lg p-3 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => handleApplyTemplate(template)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          "bg-white/10 text-cyan-400"
                        )}
                      >
                        <CategoryIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">
                            {template.name}
                          </span>
                          {template.isFavorite && (
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          )}
                        </div>
                        {template.description && (
                          <p className="text-xs text-white/50 truncate mt-0.5">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className="h-4 text-[9px] border-white/20"
                          >
                            {template.category}
                          </Badge>
                          {(template.usageCount || 0) > 0 && (
                            <span className="text-[10px] text-white/30">
                              Used {template.usageCount}x
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-white/40 hover:text-amber-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(template.id);
                              }}
                            >
                              {template.isFavorite ? (
                                <StarOff className="w-3 h-3" />
                              ) : (
                                <Star className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {template.isFavorite ? "Unfavorite" : "Favorite"}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-white/40 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPrompt(template);
                              }}
                            >
                              {copiedId === template.id ? (
                                <Check className="w-3 h-3 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy prompt</TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-white/40 hover:text-white"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-32 bg-gray-900/95 border-white/10"
                          >
                            <DropdownMenuItem
                              className="text-xs gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTemplate(template);
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs gap-2 text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(template.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Selected Text Preview */}
        {selectedText && (
          <div className="px-4 py-2 border-t border-white/10 bg-white/5">
            <span className="text-[10px] text-white/40">Selected text:</span>
            <p className="text-xs text-white/70 line-clamp-2 mt-0.5">
              {selectedText}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/10 text-center">
          <p className="text-[10px] text-white/30">
            Click a template to apply it • Use {"{{text}}"} for selected text
          </p>
        </div>
      </div>

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-900/95 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/70">Name</label>
              <Input
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Template name"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/70">
                Description (optional)
              </label>
              <Input
                value={newTemplate.description}
                onChange={(e) =>
                  setNewTemplate((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Brief description"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/70">
                Prompt Template
              </label>
              <Textarea
                value={newTemplate.prompt}
                onChange={(e) =>
                  setNewTemplate((prev) => ({ ...prev, prompt: e.target.value }))
                }
                placeholder="Use {{text}} to insert selected text"
                className="min-h-[100px] bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/70">
                Category
              </label>
              <Input
                value={newTemplate.category}
                onChange={(e) =>
                  setNewTemplate((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                placeholder="Category"
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog
        open={editingTemplate !== null}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
      >
        <DialogContent className="bg-gray-900/95 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">Name</label>
                <Input
                  value={editingTemplate.name}
                  onChange={(e) =>
                    setEditingTemplate((prev) =>
                      prev ? { ...prev, name: e.target.value } : null
                    )
                  }
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">
                  Description
                </label>
                <Input
                  value={editingTemplate.description || ""}
                  onChange={(e) =>
                    setEditingTemplate((prev) =>
                      prev ? { ...prev, description: e.target.value } : null
                    )
                  }
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">
                  Prompt Template
                </label>
                <Textarea
                  value={editingTemplate.prompt}
                  onChange={(e) =>
                    setEditingTemplate((prev) =>
                      prev ? { ...prev, prompt: e.target.value } : null
                    )
                  }
                  className="min-h-[100px] bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">
                  Category
                </label>
                <Input
                  value={editingTemplate.category}
                  onChange={(e) =>
                    setEditingTemplate((prev) =>
                      prev ? { ...prev, category: e.target.value } : null
                    )
                  }
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTemplate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
