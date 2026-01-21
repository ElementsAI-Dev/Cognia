import { FileCode, Layers, Sparkles } from 'lucide-react';
import type { RuleTarget, RuleTemplate, EditorVariable } from '@/types/settings/rules';

// Gemini target icon component
export const GeminiIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

/**
 * Rule targets for different AI editors
 */
export const RULE_TARGETS: RuleTarget[] = [
  {
    id: 'cursor',
    label: 'Cursor',
    path: '.cursorrules',
    icon: <FileCode className="h-4 w-4" />,
  },
  {
    id: 'windsurf',
    label: 'Windsurf',
    path: '.windsurfrules',
    icon: <Layers className="h-4 w-4" />,
  },
  {
    id: 'copilot',
    label: 'Copilot',
    path: '.github/copilot-instructions.md',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    path: '.gemini-instructions.md',
    icon: <GeminiIcon className="h-4 w-4" />,
  },
];

/**
 * Rule templates organized by category
 */
export const RULE_TEMPLATES: Record<string, Record<string, RuleTemplate>> = {
  general: {
    base: {
      label: 'Balanced Base',
      content: `# Working Agreements\n- Respond with concise, actionable steps.\n- Prefer references to files with line numbers.\n- Ask before running long tasks.\n\n# Tools\n- Prefer built-in project scripts.\n- Avoid destructive commands.\n`,
    },
    senior: {
      label: 'Senior Engineer',
      content: `# Principles\n- Write code that is easy to delete, not easy to extend.\n- Favor composition over inheritance.\n- Keep state as local as possible.\n- Use descriptive names, avoid abbreviations.\n\n# Workflow\n- Always run linters before submitting.\n- Verify changes with existing tests.\n`,
    },
  },
  frontend: {
    react: {
      label: 'React & Tailwind',
      content: `# Frontend Rules\n- Use functional components with hooks.\n- Tailwind v4 with cn() utility for dynamic classes.\n- Use @/ alias for imports.\n- Keep components focused and small.\n- Favor Server Components for data fetching where possible.\n`,
    },
    styling: {
      label: 'Design System',
      content: `# Styling Principles\n- Use CSS variables for colors and spacing.\n- Prefer flexbox/grid for layouts.\n- Ensure high accessibility (ARIA labels, keyboard nav).\n- Use consistent spacing scales.\n`,
    },
  },
  backend: {
    typescript: {
      label: 'Node & TS',
      content: `# Backend Rules\n- Strong typing for all API inputs/outputs.\n- Use Zod for validation.\n- Implement proper error handling middleware.\n- Logging for all critical paths.\n- Prefer async/await over raw promises.\n`,
    },
  },
  testing: {
    full: {
      label: 'TDD Approach',
      content: `# Testing Rules\n- Write failing test first when possible.\n- Aim for >80% coverage on business logic.\n- Mock external services consistently.\n- Use descriptive test names (Given/When/Then).\n`,
    },
  },
};

/**
 * Editor variables for template insertion
 */
export const EDITOR_VARIABLES: EditorVariable[] = [
  { label: 'Project Name', value: '{{project_name}}', description: 'Name of the current project' },
  { label: 'Stack Info', value: '{{tech_stack}}', description: 'Detected technology stack' },
  { label: 'Author', value: '{{author}}', description: 'Current user name' },
  { label: 'Current Date', value: '{{date}}', description: 'Current system date' },
  { label: 'Style Guide', value: '{{style_guide}}', description: 'Project style conventions' },
];

/**
 * Maximum history size for undo/redo
 */
export const MAX_HISTORY_SIZE = 50;
