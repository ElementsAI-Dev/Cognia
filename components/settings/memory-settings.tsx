'use client';

/**
 * Memory Settings - manage AI memory preferences and stored memories
 */

import { useState } from 'react';
import { Brain, Plus, Trash2, Edit2, Check, X, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useMemoryStore } from '@/stores';
import type { Memory, MemoryType, CreateMemoryInput } from '@/types';

const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  preference: 'Preference',
  fact: 'Fact',
  instruction: 'Instruction',
  context: 'Context',
};

const MEMORY_TYPE_COLORS: Record<MemoryType, string> = {
  preference: 'bg-blue-500',
  fact: 'bg-green-500',
  instruction: 'bg-purple-500',
  context: 'bg-orange-500',
};

export function MemorySettings() {
  const {
    memories,
    settings,
    updateSettings,
    createMemory,
    updateMemory,
    deleteMemory,
    clearAllMemories,
    searchMemories,
  } = useMemoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);

  // New memory form state
  const [newMemory, setNewMemory] = useState<CreateMemoryInput>({
    type: 'preference',
    content: '',
    category: '',
    tags: [],
  });

  const filteredMemories = searchQuery
    ? searchMemories(searchQuery)
    : memories;

  const handleCreateMemory = () => {
    if (!newMemory.content.trim()) return;

    createMemory({
      ...newMemory,
      tags: newMemory.tags?.filter(Boolean),
    });

    setNewMemory({
      type: 'preference',
      content: '',
      category: '',
      tags: [],
    });
    setIsAddDialogOpen(false);
  };

  const handleUpdateMemory = (memory: Memory) => {
    if (!memory.content.trim()) return;

    updateMemory(memory.id, {
      content: memory.content,
      type: memory.type,
      category: memory.category,
      tags: memory.tags,
    });

    setEditingMemory(null);
  };

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Memory Settings
          </CardTitle>
          <CardDescription>
            Configure how Claude remembers information across conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="memory-enabled">Enable Memory</Label>
              <p className="text-sm text-muted-foreground">
                Allow AI to remember information across conversations
              </p>
            </div>
            <Switch
              id="memory-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-infer">Auto-detect memories</Label>
              <p className="text-sm text-muted-foreground">
                Automatically extract preferences and facts from conversations
              </p>
            </div>
            <Switch
              id="auto-infer"
              checked={settings.autoInfer}
              onCheckedChange={(autoInfer) => updateSettings({ autoInfer })}
              disabled={!settings.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="inject-prompt">Include in system prompt</Label>
              <p className="text-sm text-muted-foreground">
                Inject memories into the AI system prompt
              </p>
            </div>
            <Switch
              id="inject-prompt"
              checked={settings.injectInSystemPrompt}
              onCheckedChange={(injectInSystemPrompt) =>
                updateSettings({ injectInSystemPrompt })
              }
              disabled={!settings.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Memories List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stored Memories</CardTitle>
              <CardDescription>
                {memories.length} memories stored
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Memory
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Memory</DialogTitle>
                    <DialogDescription>
                      Add something for the AI to remember about you
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={newMemory.type}
                        onValueChange={(type: MemoryType) =>
                          setNewMemory((prev) => ({ ...prev, type }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(MEMORY_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea
                        placeholder="e.g., I prefer concise responses with code examples"
                        value={newMemory.content}
                        onChange={(e) =>
                          setNewMemory((prev) => ({ ...prev, content: e.target.value }))
                        }
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category (optional)</Label>
                      <Input
                        placeholder="e.g., coding, writing, general"
                        value={newMemory.category || ''}
                        onChange={(e) =>
                          setNewMemory((prev) => ({ ...prev, category: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateMemory} disabled={!newMemory.content.trim()}>
                      Save Memory
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {memories.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all memories?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all stored memories. This action cannot
                        be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={clearAllMemories}>
                        Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Memory List */}
          <div className="space-y-3">
            {filteredMemories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No matching memories found' : 'No memories stored yet'}
              </div>
            ) : (
              filteredMemories.map((memory) => (
                <MemoryItem
                  key={memory.id}
                  memory={memory}
                  isEditing={editingMemory?.id === memory.id}
                  editingMemory={editingMemory}
                  onEdit={() => setEditingMemory({ ...memory })}
                  onCancelEdit={() => setEditingMemory(null)}
                  onSaveEdit={() => editingMemory && handleUpdateMemory(editingMemory)}
                  onUpdateEditing={setEditingMemory}
                  onToggle={(enabled) => updateMemory(memory.id, { enabled })}
                  onDelete={() => deleteMemory(memory.id)}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MemoryItemProps {
  memory: Memory;
  isEditing: boolean;
  editingMemory: Memory | null;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onUpdateEditing: (memory: Memory | null) => void;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}

function MemoryItem({
  memory,
  isEditing,
  editingMemory,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onUpdateEditing,
  onToggle,
  onDelete,
}: MemoryItemProps) {
  if (isEditing && editingMemory) {
    return (
      <div className="p-3 border rounded-lg space-y-3">
        <Select
          value={editingMemory.type}
          onValueChange={(type: MemoryType) =>
            onUpdateEditing({ ...editingMemory, type })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MEMORY_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          value={editingMemory.content}
          onChange={(e) =>
            onUpdateEditing({ ...editingMemory, content: e.target.value })
          }
          rows={2}
        />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={onCancelEdit}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={onSaveEdit}>
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-3 border rounded-lg ${
        !memory.enabled ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="secondary"
              className={`${MEMORY_TYPE_COLORS[memory.type]} text-white text-xs`}
            >
              {MEMORY_TYPE_LABELS[memory.type]}
            </Badge>
            {memory.category && (
              <Badge variant="outline" className="text-xs">
                {memory.category}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {memory.source === 'inferred' ? '(auto-detected)' : ''}
            </span>
          </div>
          <p className="text-sm">{memory.content}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Used {memory.useCount} times • Created{' '}
            {memory.createdAt.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Switch
            checked={memory.enabled}
            onCheckedChange={onToggle}
            className="scale-75"
          />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MemorySettings;
