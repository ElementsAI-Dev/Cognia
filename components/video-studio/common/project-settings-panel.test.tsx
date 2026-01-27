'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectSettingsPanel, DEFAULT_PROJECT_SETTINGS } from './project-settings-panel';
import type { ProjectSettings } from './project-settings-panel';

const mockSettings: ProjectSettings = {
  ...DEFAULT_PROJECT_SETTINGS,
  name: 'Test Project',
};

describe('ProjectSettingsPanel', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSettingsChange = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(
      <ProjectSettingsPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );
    expect(screen.getByText('Project Settings')).toBeInTheDocument();
  });

  it('renders project name input', () => {
    render(
      <ProjectSettingsPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );
    expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
  });

  it('renders Video Settings section', () => {
    render(
      <ProjectSettingsPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );
    expect(screen.getByText('Video Settings')).toBeInTheDocument();
  });

  it('renders Audio Settings section', () => {
    render(
      <ProjectSettingsPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );
    expect(screen.getByText('Audio Settings')).toBeInTheDocument();
  });

  it('renders resolution presets', () => {
    render(
      <ProjectSettingsPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );
    expect(screen.getByText('1080p HD')).toBeInTheDocument();
    expect(screen.getByText('4K UHD')).toBeInTheDocument();
  });

  it('renders save button', () => {
    render(
      <ProjectSettingsPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );
    expect(screen.getByText('Save Settings')).toBeInTheDocument();
  });

  it('renders reset button', () => {
    render(
      <ProjectSettingsPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );
    expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
  });

  it('calls onSave when save clicked', () => {
    render(
      <ProjectSettingsPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );
    fireEvent.click(screen.getByText('Save Settings'));
    expect(mockOnSave).toHaveBeenCalled();
  });

  it('calls onReset when reset clicked', () => {
    render(
      <ProjectSettingsPanel
        open={true}
        onOpenChange={mockOnOpenChange}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );
    fireEvent.click(screen.getByText('Reset to Defaults'));
    expect(mockOnReset).toHaveBeenCalled();
  });
});
