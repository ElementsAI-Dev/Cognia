# Workflow Template Marketplace Architecture

## Overview

The workflow template marketplace provides a centralized location for users to discover, use, and share workflow templates. It integrates with the existing workflow editor and Git integration.

## Architecture Components

### 1. Template Store (`stores/workflow/template-market-store.ts`)
Zustand store managing:
- Template catalog (built-in templates)
- User templates (custom templates)
- Template metadata (categories, tags, ratings)
- Template search and filtering
- Template usage statistics

### 2. Template Service (`lib/workflow/template-service.ts`)
Business logic for:
- Template validation
- Template serialization/deserialization
- Template import/export
- Template versioning
- Template compatibility checking

### 3. Git Integration Service (`lib/workflow/git-integration.ts`)
Git operations for templates:
- Clone templates from Git repositories
- Push templates to Git
- Pull updates from remote
- Branch management
- Conflict resolution

### 4. Template Marketplace UI (`components/workflow-marketplace/`)
React components:
- Template browser
- Template preview
- Template editor
- Template import/export
- Git integration panel

## Data Models

### WorkflowTemplate
```typescript
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  workflow: VisualWorkflow;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    usageCount: number;
    rating: number;
    isOfficial: boolean;
    source?: 'built-in' | 'user' | 'git';
    gitUrl?: string;
    gitBranch?: string;
  };
}
```

### TemplateCategory
```typescript
interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  templates: string[];
}
```

## Features

### 1. Template Discovery
- Browse templates by category
- Search templates by name, tags, description
- Filter by rating, usage count, date
- Sort by various criteria

### 2. Template Management
- Create custom templates
- Clone existing templates
- Edit templates
- Delete templates
- Export templates (JSON, YAML)
- Import templates

### 3. Git Integration
- Clone templates from Git repositories
- Push templates to Git
- Pull updates from remote
- Manage branches
- Resolve conflicts
- Sync with remote

### 4. Template Sharing
- Share templates via Git
- Publish to marketplace
- Rate and review templates
- Track usage statistics

## Implementation Plan

### Phase 1: Core Store and Service
1. Create template market store
2. Create template service
3. Define data models
4. Implement CRUD operations

### Phase 2: Git Integration
1. Create Git integration service
2. Implement clone/pull/push operations
3. Add branch management
4. Add conflict resolution

### Phase 3: UI Components
1. Create template browser
2. Create template preview
3. Create template editor
4. Create import/export dialogs

### Phase 4: Integration
1. Integrate with workflow editor
2. Add template marketplace to sidebar
3. Add Git integration panel
4. Add template usage tracking

## File Structure

```
stores/workflow/
  ├── template-market-store.ts
  └── git-integration-store.ts

lib/workflow/
  ├── template-service.ts
  ├── git-integration-service.ts
  └── template-validators.ts

components/workflow-marketplace/
  ├── template-browser.tsx
  ├── template-preview.tsx
  ├── template-editor.tsx
  ├── template-import-dialog.tsx
  ├── template-export-dialog.tsx
  └── git-integration-panel.tsx

types/workflow/
  ├── template.ts
  └── git-integration.ts
```

## Environment Variables

```env
# Git Integration
GIT_DEFAULT_BRANCH=main
GIT_SYNC_ENABLED=true
GIT_AUTO_SYNC_INTERVAL=300000

# Template Marketplace
TEMPLATE_MARKETPLACE_ENABLED=true
TEMPLATE_CACHE_DURATION=3600000
```
