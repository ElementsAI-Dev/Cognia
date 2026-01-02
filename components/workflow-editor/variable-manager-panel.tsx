'use client';

/**
 * VariableManagerPanel - Manage workflow variables with autocomplete support
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { cn } from '@/lib/utils';
import {
  Variable,
  Plus,
  Trash2,
  Edit2,
  Copy,
  MoreHorizontal,
  Search,
  Braces,
  Hash,
  ToggleLeft,
  List,
  FileJson,
  Globe,
  Lock,
  Unlock,
  AlertCircle,
} from 'lucide-react';

// Variable types
type VariableType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';

interface WorkflowVariable {
  id: string;
  name: string;
  type: VariableType;
  defaultValue?: string;
  description?: string;
  isSecret: boolean;
  scope: 'global' | 'local';
  usedByNodes: string[];
}

const TYPE_ICONS: Record<VariableType, React.ComponentType<{ className?: string }>> = {
  string: Braces,
  number: Hash,
  boolean: ToggleLeft,
  array: List,
  object: FileJson,
  any: Globe,
};

const TYPE_COLORS: Record<VariableType, string> = {
  string: 'text-green-500 bg-green-500/10',
  number: 'text-blue-500 bg-blue-500/10',
  boolean: 'text-purple-500 bg-purple-500/10',
  array: 'text-orange-500 bg-orange-500/10',
  object: 'text-cyan-500 bg-cyan-500/10',
  any: 'text-gray-500 bg-gray-500/10',
};

interface VariableManagerPanelProps {
  className?: string;
}

export function VariableManagerPanel({ className }: VariableManagerPanelProps) {
  const _t = useTranslations('workflowEditor');
  const { 
    currentWorkflow, 
    setWorkflowVariable, 
    deleteWorkflowVariable 
  } = useWorkflowEditorStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<WorkflowVariable | null>(null);
  const [newVariable, setNewVariable] = useState<Partial<WorkflowVariable>>({
    name: '',
    type: 'string',
    defaultValue: '',
    description: '',
    isSecret: false,
    scope: 'global',
  });

  // Parse variables from workflow
  const variables = useMemo((): WorkflowVariable[] => {
    if (!currentWorkflow) return [];
    
    const vars: WorkflowVariable[] = [];
    const workflowVars = currentWorkflow.variables || {};
    
    Object.entries(workflowVars).forEach(([name, value]) => {
      const varData = typeof value === 'object' && value !== null ? value as Record<string, unknown> : { value };
      vars.push({
        id: `var-${name}`,
        name,
        type: (varData.type as VariableType) || 'any',
        defaultValue: String(varData.defaultValue ?? varData.value ?? ''),
        description: String(varData.description || ''),
        isSecret: Boolean(varData.isSecret),
        scope: (varData.scope as 'global' | 'local') || 'global',
        usedByNodes: [],
      });
    });
    
    return vars;
  }, [currentWorkflow]);

  // Filter variables
  const filteredVariables = useMemo(() => {
    if (!searchQuery) return variables;
    const query = searchQuery.toLowerCase();
    return variables.filter(v => 
      v.name.toLowerCase().includes(query) ||
      v.description?.toLowerCase().includes(query)
    );
  }, [variables, searchQuery]);

  // Group by scope
  const groupedVariables = useMemo(() => {
    return {
      global: filteredVariables.filter(v => v.scope === 'global'),
      local: filteredVariables.filter(v => v.scope === 'local'),
    };
  }, [filteredVariables]);

  const handleSaveVariable = useCallback(() => {
    if (!currentWorkflow || !newVariable.name) return;
    
    const varName = newVariable.name.trim();
    const varData = {
      type: newVariable.type,
      defaultValue: newVariable.defaultValue,
      description: newVariable.description,
      isSecret: newVariable.isSecret,
      scope: newVariable.scope,
    };
    
    setWorkflowVariable(varName, varData);
    
    setEditDialogOpen(false);
    setEditingVariable(null);
    setNewVariable({
      name: '',
      type: 'string',
      defaultValue: '',
      description: '',
      isSecret: false,
      scope: 'global',
    });
  }, [currentWorkflow, newVariable, setWorkflowVariable]);

  const handleEditVariable = useCallback((variable: WorkflowVariable) => {
    setEditingVariable(variable);
    setNewVariable({
      name: variable.name,
      type: variable.type,
      defaultValue: variable.defaultValue,
      description: variable.description,
      isSecret: variable.isSecret,
      scope: variable.scope,
    });
    setEditDialogOpen(true);
  }, []);

  const handleDeleteVariable = useCallback((variableName: string) => {
    if (!currentWorkflow) return;
    deleteWorkflowVariable(variableName);
  }, [currentWorkflow, deleteWorkflowVariable]);

  const copyVariableReference = useCallback((name: string) => {
    navigator.clipboard.writeText(`{{${name}}}`);
  }, []);

  const renderVariableItem = (variable: WorkflowVariable) => {
    const TypeIcon = TYPE_ICONS[variable.type];
    
    return (
      <div
        key={variable.id}
        className="group flex items-center gap-2 p-2 rounded-lg border hover:bg-accent/50 transition-colors"
      >
        <div className={cn('p-1.5 rounded', TYPE_COLORS[variable.type])}>
          <TypeIcon className="h-3.5 w-3.5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium truncate">
              {variable.name}
            </span>
            {variable.isSecret && (
              <Lock className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          {variable.description && (
            <p className="text-xs text-muted-foreground truncate">
              {variable.description}
            </p>
          )}
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {variable.type}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {variable.defaultValue ? (
                <div>
                  <div className="text-xs">Default: {variable.isSecret ? '••••••' : variable.defaultValue}</div>
                </div>
              ) : (
                'No default value'
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => copyVariableReference(variable.name)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Reference
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEditVariable(variable)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteVariable(variable.name)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" title="Variables">
          <Variable className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className={cn('w-[350px] sm:w-[400px]', className)}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Variable className="h-5 w-5" />
            Variables
          </SheetTitle>
          <SheetDescription>
            Manage workflow variables and their mappings
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Search and Add */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search variables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                setEditingVariable(null);
                setEditDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Variable List */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            {variables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Variable className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No variables defined</p>
                <p className="text-xs mt-1">Click + to add a variable</p>
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={['global', 'local']} className="space-y-2">
                {groupedVariables.global.length > 0 && (
                  <AccordionItem value="global" className="border rounded-lg px-3">
                    <AccordionTrigger className="py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Global Variables
                        <Badge variant="secondary" className="ml-auto">
                          {groupedVariables.global.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1 pb-2">
                      {groupedVariables.global.map(renderVariableItem)}
                    </AccordionContent>
                  </AccordionItem>
                )}

                {groupedVariables.local.length > 0 && (
                  <AccordionItem value="local" className="border rounded-lg px-3">
                    <AccordionTrigger className="py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Local Variables
                        <Badge variant="secondary" className="ml-auto">
                          {groupedVariables.local.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1 pb-2">
                      {groupedVariables.local.map(renderVariableItem)}
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            )}
          </ScrollArea>

          {/* Variable Reference Help */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-xs font-medium mb-1">
              <AlertCircle className="h-3.5 w-3.5" />
              How to use variables
            </div>
            <p className="text-xs text-muted-foreground">
              Reference variables in prompts using <code className="bg-muted px-1 rounded">{'{{variableName}}'}</code>
            </p>
          </div>
        </div>

        {/* Edit/Add Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingVariable ? 'Edit Variable' : 'Add Variable'}
              </DialogTitle>
              <DialogDescription>
                {editingVariable 
                  ? 'Update the variable configuration'
                  : 'Create a new workflow variable'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newVariable.name}
                  onChange={(e) => setNewVariable(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="variableName"
                  className="font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newVariable.type}
                    onValueChange={(value) => setNewVariable(prev => ({ ...prev, type: value as VariableType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="array">Array</SelectItem>
                      <SelectItem value="object">Object</SelectItem>
                      <SelectItem value="any">Any</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select
                    value={newVariable.scope}
                    onValueChange={(value) => setNewVariable(prev => ({ ...prev, scope: value as 'global' | 'local' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Default Value</Label>
                <Input
                  type={newVariable.isSecret ? 'password' : 'text'}
                  value={newVariable.defaultValue}
                  onChange={(e) => setNewVariable(prev => ({ ...prev, defaultValue: e.target.value }))}
                  placeholder="Enter default value..."
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newVariable.description}
                  onChange={(e) => setNewVariable(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What is this variable for?"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {newVariable.isSecret ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Unlock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">Secret value</span>
                </div>
                <Button
                  variant={newVariable.isSecret ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewVariable(prev => ({ ...prev, isSecret: !prev.isSecret }))}
                >
                  {newVariable.isSecret ? 'Yes' : 'No'}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveVariable} disabled={!newVariable.name?.trim()}>
                {editingVariable ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

export default VariableManagerPanel;
