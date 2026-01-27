'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SettingTooltip } from './setting-tooltip';

describe('SettingTooltip', () => {
  it('renders children', () => {
    render(
      <SettingTooltip content="Tooltip content">
        <span>Setting Label</span>
      </SettingTooltip>
    );
    expect(screen.getByText('Setting Label')).toBeInTheDocument();
  });

  it('renders info icon', () => {
    const { container } = render(
      <SettingTooltip content="Tooltip content">
        <span>Setting Label</span>
      </SettingTooltip>
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has cursor-help class on trigger', () => {
    const { container } = render(
      <SettingTooltip content="Tooltip content">
        <span>Setting Label</span>
      </SettingTooltip>
    );
    const trigger = container.querySelector('.cursor-help');
    expect(trigger).toBeInTheDocument();
  });

  it('renders with inline-flex layout', () => {
    const { container } = render(
      <SettingTooltip content="Tooltip content">
        <span>Setting Label</span>
      </SettingTooltip>
    );
    const trigger = container.querySelector('.inline-flex');
    expect(trigger).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <SettingTooltip content="Tooltip content">
        <span>Part 1</span>
        <span>Part 2</span>
      </SettingTooltip>
    );
    expect(screen.getByText('Part 1')).toBeInTheDocument();
    expect(screen.getByText('Part 2')).toBeInTheDocument();
  });
});
