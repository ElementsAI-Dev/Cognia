/**
 * Tests for EditorToolbar component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { EditorToolbar, type EditorToolbarProps } from './editor-toolbar';

// Mock ZoomControls
jest.mock('../common/zoom-controls', () => ({
  ZoomControls: ({ onZoomChange, onFitToView }: { onZoomChange: (z: number) => void; onFitToView: () => void }) => (
    <div data-testid="zoom-controls">
      <button data-testid="zoom-change" onClick={() => onZoomChange(2)}>Zoom</button>
      <button data-testid="fit-to-view" onClick={onFitToView}>Fit</button>
    </div>
  ),
}));

const messages = {
  editorPanel: {
    importVideo: 'Import Video',
    undo: 'Undo',
    redo: 'Redo',
    trimClip: 'Trim Clip',
    effects: 'Effects',
    transitions: 'Transitions',
    subtitles: 'Subtitles',
    colorCorrection: 'Color Correction',
    speedControls: 'Speed Controls',
    markers: 'Markers',
    audioMixer: 'Audio Mixer',
    layers: 'Layers',
    keyboardShortcuts: 'Keyboard Shortcuts',
    projectSettings: 'Project Settings',
    export: 'Export',
  },
};

const defaultProps: EditorToolbarProps = {
  editorMode: 'timeline',
  setEditorMode: jest.fn(),
  showSidePanel: false,
  sidePanelTab: 'effects',
  onToggleSidePanel: jest.fn(),
  canUndo: false,
  canRedo: false,
  onUndo: jest.fn(),
  onRedo: jest.fn(),
  onImportVideo: jest.fn(),
  onOpenTrim: jest.fn(),
  hasSelectedClip: false,
  zoom: 1,
  onZoomChange: jest.fn(),
  onFitToView: jest.fn(),
  onShowKeyboardShortcuts: jest.fn(),
  onShowProjectSettings: jest.fn(),
  onShowExportDialog: jest.fn(),
};

function renderToolbar(props: Partial<EditorToolbarProps> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <EditorToolbar {...defaultProps} {...props} />
    </NextIntlClientProvider>
  );
}

// Helper: find the button that is a sibling (within same tooltip wrapper) of a tooltip-content text
function findButtonByTooltip(text: string): HTMLButtonElement {
  const tooltipContent = screen.getByText(text);
  const tooltipWrapper = tooltipContent.closest('[data-testid="tooltip"]')!;
  return tooltipWrapper.querySelector('button')!;
}

describe('EditorToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = renderToolbar();
    expect(container.firstChild).toBeTruthy();
  });

  it('should render zoom controls', () => {
    renderToolbar();
    expect(screen.getByTestId('zoom-controls')).toBeInTheDocument();
  });

  it('should call onImportVideo when import button is clicked', () => {
    renderToolbar();
    fireEvent.click(findButtonByTooltip('Import Video'));
    expect(defaultProps.onImportVideo).toHaveBeenCalled();
  });

  it('should disable undo button when canUndo is false', () => {
    renderToolbar({ canUndo: false });
    expect(findButtonByTooltip('Undo')).toBeDisabled();
  });

  it('should enable undo button when canUndo is true', () => {
    renderToolbar({ canUndo: true });
    expect(findButtonByTooltip('Undo')).not.toBeDisabled();
  });

  it('should call onUndo when undo button is clicked', () => {
    renderToolbar({ canUndo: true });
    fireEvent.click(findButtonByTooltip('Undo'));
    expect(defaultProps.onUndo).toHaveBeenCalled();
  });

  it('should disable redo button when canRedo is false', () => {
    renderToolbar({ canRedo: false });
    expect(findButtonByTooltip('Redo')).toBeDisabled();
  });

  it('should call onRedo when redo button is clicked', () => {
    renderToolbar({ canRedo: true });
    fireEvent.click(findButtonByTooltip('Redo'));
    expect(defaultProps.onRedo).toHaveBeenCalled();
  });

  it('should disable trim button when no clip selected', () => {
    renderToolbar({ hasSelectedClip: false });
    expect(findButtonByTooltip('Trim Clip')).toBeDisabled();
  });

  it('should enable trim button when clip is selected', () => {
    renderToolbar({ hasSelectedClip: true });
    expect(findButtonByTooltip('Trim Clip')).not.toBeDisabled();
  });

  it('should call setEditorMode when effects button is clicked', () => {
    const setEditorMode = jest.fn();
    renderToolbar({ setEditorMode });
    fireEvent.click(findButtonByTooltip('Effects'));
    expect(setEditorMode).toHaveBeenCalledWith('effects');
  });

  it('should call setEditorMode when transitions button is clicked', () => {
    const setEditorMode = jest.fn();
    renderToolbar({ setEditorMode });
    fireEvent.click(findButtonByTooltip('Transitions'));
    expect(setEditorMode).toHaveBeenCalledWith('transitions');
  });

  it('should call setEditorMode when subtitles button is clicked', () => {
    const setEditorMode = jest.fn();
    renderToolbar({ setEditorMode });
    fireEvent.click(findButtonByTooltip('Subtitles'));
    expect(setEditorMode).toHaveBeenCalledWith('subtitles');
  });

  it('should call onToggleSidePanel with color tab', () => {
    const onToggleSidePanel = jest.fn();
    renderToolbar({ onToggleSidePanel });
    fireEvent.click(findButtonByTooltip('Color Correction'));
    expect(onToggleSidePanel).toHaveBeenCalledWith('color');
  });

  it('should call onToggleSidePanel with audio tab', () => {
    const onToggleSidePanel = jest.fn();
    renderToolbar({ onToggleSidePanel });
    fireEvent.click(findButtonByTooltip('Audio Mixer'));
    expect(onToggleSidePanel).toHaveBeenCalledWith('audio');
  });

  it('should call onToggleSidePanel with layers tab', () => {
    const onToggleSidePanel = jest.fn();
    renderToolbar({ onToggleSidePanel });
    fireEvent.click(findButtonByTooltip('Layers'));
    expect(onToggleSidePanel).toHaveBeenCalledWith('layers');
  });

  it('should call onShowExportDialog when export button is clicked', () => {
    renderToolbar();
    fireEvent.click(findButtonByTooltip('Export'));
    expect(defaultProps.onShowExportDialog).toHaveBeenCalled();
  });

  it('should call onShowKeyboardShortcuts', () => {
    renderToolbar();
    fireEvent.click(findButtonByTooltip('Keyboard Shortcuts'));
    expect(defaultProps.onShowKeyboardShortcuts).toHaveBeenCalled();
  });

  it('should call onShowProjectSettings', () => {
    renderToolbar();
    fireEvent.click(findButtonByTooltip('Project Settings'));
    expect(defaultProps.onShowProjectSettings).toHaveBeenCalled();
  });
});
