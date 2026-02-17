import React from 'react';
import { render } from '@testing-library/react';

export function renderNodeConfig<TData>(
  Component: React.ComponentType<{ data: TData; onUpdate: (updates: Partial<TData>) => void }>,
  data: TData,
  onUpdate: jest.Mock = jest.fn()
) {
  const utils = render(<Component data={data} onUpdate={onUpdate} />);
  return { ...utils, onUpdate };
}

export function createVariableRef(nodeId = 'node-1', variableName = 'value') {
  return { nodeId, variableName };
}

export const mockClipboardWriteText = () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.assign(navigator, {
    clipboard: { writeText },
  });
  return writeText;
};
