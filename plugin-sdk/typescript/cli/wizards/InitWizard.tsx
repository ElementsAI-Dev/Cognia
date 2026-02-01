/**
 * InitWizard Component
 *
 * Interactive wizard for initializing plugin SDK in existing projects.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import * as fs from 'fs';
import * as path from 'path';
import {
  Header,
  Steps,
  TextInput,
  MultiSelect,
  Confirm,
  Spinner,
  colors,
  symbols,
} from '../ui/index.js';
import { useWizard } from './hooks/useWizard.js';

export interface InitWizardData {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  capabilities: string[];
  permissions: string[];
}

export interface InitWizardProps {
  /** Current working directory */
  cwd: string;
  /** Existing package.json data if available */
  packageJson?: {
    name?: string;
    version?: string;
    description?: string;
    author?: string;
  };
  /** Called when wizard completes */
  onComplete: (data: InitWizardData) => Promise<void>;
  /** Called when wizard is cancelled */
  onCancel: () => void;
}

const CAPABILITIES = [
  { label: 'tools', value: 'tools', description: 'AI agent tools', defaultSelected: true },
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

const WIZARD_STEPS = [
  { id: 'id', title: 'Plugin ID' },
  { id: 'name', title: 'Plugin Name' },
  { id: 'info', title: 'Description & Author' },
  { id: 'capabilities', title: 'Capabilities' },
  { id: 'permissions', title: 'Permissions' },
  { id: 'confirm', title: 'Confirm' },
];

export function InitWizard({
  cwd,
  packageJson,
  onComplete,
  onCancel,
}: InitWizardProps): React.ReactElement {
  const { exit } = useApp();
  const projectName = path.basename(cwd);

  // Derive defaults from package.json or project folder
  const defaults = {
    id: projectName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    name: packageJson?.name || projectName,
    version: packageJson?.version || '1.0.0',
    description: packageJson?.description || '',
    author: typeof packageJson?.author === 'string' ? packageJson.author : '',
  };

  const wizard = useWizard<InitWizardData>({
    steps: WIZARD_STEPS,
    initialData: {
      id: defaults.id,
      name: defaults.name,
      version: defaults.version,
      description: defaults.description,
      author: defaults.author,
      capabilities: ['tools'],
      permissions: ['storage', 'network'],
    },
    onComplete,
    onCancel: () => {
      onCancel();
      exit();
    },
  });

  // Track which info field we're on
  const [infoStep, setInfoStep] = useState(0);

  // Handle escape key to cancel
  useInput((input: string, key: { escape?: boolean }) => {
    if (key.escape) {
      wizard.cancel();
    }
  });

  if (wizard.isComplete) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={colors.success} bold>
          {symbols.check} Plugin initialized successfully!
        </Text>
      </Box>
    );
  }

  if (wizard.isSubmitting) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header title="Initialize Plugin SDK" />
        <Spinner text="Initializing plugin..." />
      </Box>
    );
  }

  const renderStep = (): React.ReactElement => {
    switch (wizard.step.id) {
      case 'id':
        return (
          <TextInput
            label="Plugin ID"
            placeholder={defaults.id}
            defaultValue={wizard.data.id}
            validate={(value) => {
              if (!value.trim()) return 'Plugin ID is required';
              if (!/^[a-z][a-z0-9-]*$/.test(value)) {
                return 'Use lowercase letters, numbers, and hyphens only';
              }
              return undefined;
            }}
            onSubmit={(value) => {
              wizard.setData({ id: value });
              wizard.next();
            }}
          />
        );

      case 'name':
        return (
          <TextInput
            label="Plugin Name"
            placeholder={defaults.name}
            defaultValue={wizard.data.name}
            validate={(value) => {
              if (!value.trim()) return 'Plugin name is required';
              return undefined;
            }}
            onSubmit={(value) => {
              wizard.setData({ name: value });
              wizard.next();
            }}
          />
        );

      case 'info':
        const infoFields = [
          { key: 'version', label: 'Version', default: defaults.version },
          { key: 'description', label: 'Description', default: defaults.description },
          { key: 'author', label: 'Author', default: defaults.author },
        ];
        const currentField = infoFields[infoStep];

        if (!currentField) {
          setTimeout(() => wizard.next(), 0);
          return <Text color={colors.dim}>...</Text>;
        }

        return (
          <TextInput
            label={currentField.label}
            placeholder={currentField.default || `Enter ${currentField.label.toLowerCase()}`}
            defaultValue={wizard.data[currentField.key as keyof InitWizardData] as string}
            onSubmit={(value) => {
              wizard.setData({ [currentField.key]: value || currentField.default });
              setInfoStep((prev) => prev + 1);
            }}
          />
        );

      case 'capabilities':
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

      case 'confirm':
        return (
          <Box flexDirection="column">
            <Text bold>Summary:</Text>
            <Box marginLeft={2} flexDirection="column" marginY={1}>
              <Text>ID: <Text color={colors.info}>{wizard.data.id}</Text></Text>
              <Text>Name: <Text color={colors.info}>{wizard.data.name}</Text></Text>
              <Text>Version: <Text color={colors.info}>{wizard.data.version}</Text></Text>
              <Text>Capabilities: <Text color={colors.info}>{wizard.data.capabilities.join(', ') || 'None'}</Text></Text>
              <Text>Permissions: <Text color={colors.info}>{wizard.data.permissions.join(', ') || 'None'}</Text></Text>
            </Box>
            <Confirm
              label="Initialize plugin?"
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
        );

      default:
        return <Text>Unknown step</Text>;
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Header title="Initialize Plugin SDK" subtitle={`Project: ${cwd}`} />

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
        </Text>
      </Box>
    </Box>
  );
}

export default InitWizard;
