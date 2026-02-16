/**
 * CreateWizard Component
 *
 * Interactive wizard for creating new plugins.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import {
  Header,
  Steps,
  TextInput,
  Select,
  MultiSelect,
  Confirm,
  FileTree,
  Spinner,
  colors,
  symbols,
  generateFileTree,
} from '../ui/index';
import { useWizard } from './hooks/useWizard';

// Template definitions
const TEMPLATES = [
  {
    label: '🔧 Basic Plugin',
    value: 'basic',
    description: 'Minimal setup with entry point only',
  },
  {
    label: '🛠️ Tool Plugin',
    value: 'tool',
    description: 'Plugin with AI agent tools',
  },
  {
    label: '📝 Command Plugin',
    value: 'command',
    description: 'Plugin with slash commands',
  },
  {
    label: '🎨 Full Featured',
    value: 'full',
    description: 'Tools + Commands + Components + Hooks',
  },
  {
    label: '⚙️ Custom',
    value: 'custom',
    description: 'Configure everything manually',
  },
];

const CAPABILITIES = [
  { label: 'tools', value: 'tools', description: 'AI agent tools' },
  { label: 'commands', value: 'commands', description: 'Slash commands' },
  { label: 'modes', value: 'modes', description: 'Custom AI modes' },
  { label: 'hooks', value: 'hooks', description: 'Lifecycle hooks' },
  { label: 'components', value: 'components', description: 'React UI components' },
  { label: 'a2ui', value: 'a2ui', description: 'A2UI templates' },
];

const PERMISSIONS = [
  { label: 'storage', value: 'storage', description: 'Local storage access', defaultSelected: true },
  { label: 'network', value: 'network', description: 'HTTP requests', defaultSelected: true },
  { label: 'filesystem', value: 'filesystem', description: 'File system access' },
  { label: 'shell', value: 'shell', description: 'Run shell commands' },
  { label: 'database', value: 'database', description: 'SQLite database' },
  { label: 'clipboard', value: 'clipboard', description: 'Clipboard access' },
  { label: 'notifications', value: 'notifications', description: 'System notifications' },
  { label: 'shortcuts', value: 'shortcuts', description: 'Keyboard shortcuts' },
  { label: 'secrets', value: 'secrets', description: 'Secure credential storage' },
];

export interface CreateWizardData {
  name: string;
  template: string;
  capabilities: string[];
  permissions: string[];
  typescript: boolean;
  git: boolean;
  install: boolean;
  examples: boolean;
}

export interface CreateWizardProps {
  /** Initial plugin name */
  initialName?: string;
  /** Called when wizard completes */
  onComplete: (data: CreateWizardData) => Promise<void>;
  /** Called when wizard is cancelled */
  onCancel: () => void;
}

const WIZARD_STEPS = [
  { id: 'name', title: 'Plugin Name' },
  { id: 'template', title: 'Template' },
  { id: 'capabilities', title: 'Capabilities' },
  { id: 'permissions', title: 'Permissions' },
  { id: 'config', title: 'Configuration' },
  { id: 'preview', title: 'Preview & Confirm' },
];

export function CreateWizard({
  initialName = '',
  onComplete,
  onCancel,
}: CreateWizardProps): React.ReactElement {
  const { exit } = useApp();
  const [configStep, setConfigStep] = useState(0);

  const wizard = useWizard<CreateWizardData>({
    steps: WIZARD_STEPS,
    initialData: {
      name: initialName,
      template: 'basic',
      capabilities: [],
      permissions: ['storage', 'network'],
      typescript: true,
      git: true,
      install: true,
      examples: true,
    },
    onComplete,
    onCancel: () => {
      onCancel();
      exit();
    },
  });

  // Handle escape key to cancel
  useInput((input: string, key: { escape?: boolean }) => {
    if (key.escape) {
      wizard.cancel();
    }
  });

  // Apply template defaults when template changes
  useEffect(() => {
    if (wizard.data.template !== 'custom') {
      const templateCapabilities: Record<string, string[]> = {
        basic: [],
        tool: ['tools'],
        command: ['commands'],
        full: ['tools', 'commands', 'hooks', 'components'],
      };
      wizard.setData({
        capabilities: templateCapabilities[wizard.data.template] || [],
      });
    }
  }, [wizard.data.template]);

  // Generate file tree for preview
  const getPreviewFiles = (): string[] => {
    const files = ['package.json', 'plugin.json', 'README.md'];

    if (wizard.data.typescript) {
      files.push('tsconfig.json');
      files.push('index.ts');
    } else {
      files.push('index.js');
    }

    if (wizard.data.capabilities.includes('tools')) {
      files.push(`tools/index.${wizard.data.typescript ? 'ts' : 'js'}`);
    }
    if (wizard.data.capabilities.includes('commands')) {
      files.push(`commands/index.${wizard.data.typescript ? 'ts' : 'js'}`);
    }
    if (wizard.data.capabilities.includes('hooks')) {
      files.push(`hooks/index.${wizard.data.typescript ? 'ts' : 'js'}`);
    }
    if (wizard.data.capabilities.includes('components')) {
      files.push('components/Panel.tsx');
    }

    return files;
  };

  if (wizard.isComplete) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={colors.success} bold>
          {symbols.check} Plugin created successfully!
        </Text>
      </Box>
    );
  }

  if (wizard.isSubmitting) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header title="Cognia Plugin Scaffolding" />
        <Spinner text="Creating plugin..." />
      </Box>
    );
  }

  const renderStep = (): React.ReactElement => {
    switch (wizard.step.id) {
      case 'name':
        return (
          <TextInput
            label="What is your plugin name?"
            placeholder="my-awesome-plugin"
            defaultValue={wizard.data.name}
            validate={(value) => {
              if (!value.trim()) return 'Plugin name is required';
              if (!/^[a-z][a-z0-9-]*$/.test(value)) {
                return 'Use lowercase letters, numbers, and hyphens only';
              }
              return undefined;
            }}
            onSubmit={(value) => {
              wizard.setData({ name: value });
              wizard.next();
            }}
          />
        );

      case 'template':
        return (
          <Select
            label="Choose a template:"
            options={TEMPLATES}
            onSelect={(option) => {
              wizard.setData({ template: option.value });
              wizard.next();
            }}
          />
        );

      case 'capabilities':
        if (wizard.data.template !== 'custom') {
          // Skip for non-custom templates
          setTimeout(() => wizard.next(), 0);
          return <Text color={colors.dim}>Using template defaults...</Text>;
        }
        return (
          <MultiSelect
            label="Select capabilities:"
            options={CAPABILITIES}
            onSubmit={(selected) => {
              wizard.setData({ capabilities: selected });
              wizard.next();
            }}
          />
        );

      case 'permissions':
        return (
          <MultiSelect
            label="Select required permissions:"
            options={PERMISSIONS}
            onSubmit={(selected) => {
              wizard.setData({ permissions: selected });
              wizard.next();
            }}
          />
        );

      case 'config':
        const configs = [
          { key: 'typescript', label: 'Use TypeScript?', default: true },
          { key: 'git', label: 'Initialize Git repository?', default: true },
          { key: 'install', label: 'Install dependencies?', default: true },
          { key: 'examples', label: 'Include example code?', default: true },
        ];
        const currentConfig = configs[configStep];

        if (!currentConfig) {
          // All config questions answered
          setTimeout(() => wizard.next(), 0);
          return <Text color={colors.dim}>Configuration complete...</Text>;
        }

        return (
          <Confirm
            label={currentConfig.label}
            defaultValue={wizard.data[currentConfig.key as keyof CreateWizardData] as boolean}
            onConfirm={(value) => {
              wizard.setData({ [currentConfig.key]: value });
              setConfigStep((prev) => prev + 1);
            }}
          />
        );

      case 'preview':
        const files = getPreviewFiles();
        const tree = generateFileTree(files);

        return (
          <Box flexDirection="column">
            <FileTree
              title={wizard.data.name + '/'}
              nodes={tree}
            />
            <Box marginTop={1}>
              <Text color={colors.dim}>
                Template: {wizard.data.template} | TypeScript: {wizard.data.typescript ? 'Yes' : 'No'}
              </Text>
            </Box>
            <Box marginTop={1}>
              <Confirm
                label="Create plugin?"
                defaultValue={true}
                onConfirm={(value) => {
                  if (value) {
                    wizard.submit();
                  } else {
                    wizard.cancel();
                  }
                }}
              />
            </Box>
          </Box>
        );

      default:
        return <Text>Unknown step</Text>;
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Header title="Cognia Plugin Scaffolding" subtitle="Create a new plugin project" />

      <Steps
        steps={WIZARD_STEPS}
        currentStep={wizard.currentStep}
      />

      <Box marginTop={1} flexDirection="column">
        {renderStep()}
      </Box>

      {wizard.error && (
        <Box marginTop={1}>
          <Text color={colors.error}>{symbols.error} {wizard.error}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={colors.dim}>
          Press ESC to cancel
          {!wizard.isFirst && ' | ← to go back'}
        </Text>
      </Box>
    </Box>
  );
}

export default CreateWizard;
