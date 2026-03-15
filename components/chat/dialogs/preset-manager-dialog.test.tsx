/**
 * @jest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { PresetManagerDialog } from './preset-manager-dialog';

const mockPresetsManager = jest.fn();

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      managePresets: 'Manage Presets',
    };
    return translations[key] || key;
  },
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="dialog" data-open={open}>
      {open ? (
        <>
          <button onClick={() => onOpenChange(false)}>close-dialog</button>
          {children}
        </>
      ) : null}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/presets', () => ({
  PresetsManager: (props: Record<string, unknown>) => {
    mockPresetsManager(props);
    return (
      <div data-testid="shared-presets-manager">
        <button
          onClick={() =>
            (props.onSelectPreset as ((preset: { id: string; name: string }) => void) | undefined)?.({
              id: 'preset-1',
              name: 'Preset One',
            })
          }
        >
          select-from-manager
        </button>
      </div>
    );
  },
}));

describe('PresetManagerDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the shared presets manager when open', () => {
    render(<PresetManagerDialog open onOpenChange={jest.fn()} />);

    expect(screen.getByText('Manage Presets')).toBeInTheDocument();
    expect(screen.getByTestId('shared-presets-manager')).toBeInTheDocument();
  });

  it('passes chat-driven entry props through to the shared presets manager', () => {
    render(
      <PresetManagerDialog
        open
        onOpenChange={jest.fn()}
        editPresetId="preset-42"
        openCreateOnMount
      />,
    );

    expect(mockPresetsManager).toHaveBeenCalledWith(
      expect.objectContaining({
        initialEditPresetId: 'preset-42',
        openCreateOnMount: true,
      }),
    );
  });

  it('selects a preset and closes the dialog through the wrapper', () => {
    const onOpenChange = jest.fn();
    const onPresetSelect = jest.fn();

    render(
      <PresetManagerDialog open onOpenChange={onOpenChange} onPresetSelect={onPresetSelect} />,
    );

    fireEvent.click(screen.getByText('select-from-manager'));

    expect(onPresetSelect).toHaveBeenCalledWith({ id: 'preset-1', name: 'Preset One' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
