'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Box } from 'lucide-react';
import { CollectionCard } from './collection-card';
import type { PluginCollection } from './marketplace-types';

const mockCollection: PluginCollection = {
  id: 'test-collection',
  name: 'Test Collection',
  description: 'A test collection',
  icon: Box,
  gradient: 'from-blue-500 to-purple-500',
  pluginIds: ['plugin-1', 'plugin-2', 'plugin-3'],
};

describe('CollectionCard', () => {
  it('renders collection name', () => {
    render(<CollectionCard collection={mockCollection} />);
    expect(screen.getByText('Test Collection')).toBeInTheDocument();
  });

  it('renders collection description', () => {
    render(<CollectionCard collection={mockCollection} />);
    expect(screen.getByText('A test collection')).toBeInTheDocument();
  });

  it('renders plugin count', () => {
    render(<CollectionCard collection={mockCollection} />);
    expect(screen.getByText('3 plugins')).toBeInTheDocument();
  });

  it('renders plugin icons', () => {
    const { container } = render(<CollectionCard collection={mockCollection} />);
    const pluginIcons = container.querySelectorAll('.rounded-lg.bg-muted');
    expect(pluginIcons.length).toBe(3);
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<CollectionCard collection={mockCollection} onClick={onClick} />);
    fireEvent.click(screen.getByText('Test Collection').closest('div')!.parentElement!.parentElement!);
    expect(onClick).toHaveBeenCalled();
  });

  it('renders view button on hover', () => {
    render(<CollectionCard collection={mockCollection} />);
    expect(screen.getByText('View')).toBeInTheDocument();
  });

  it('limits displayed plugin icons to 3', () => {
    const largeCollection = {
      ...mockCollection,
      pluginIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
    };
    const { container } = render(<CollectionCard collection={largeCollection} />);
    const pluginIcons = container.querySelectorAll('.rounded-lg.bg-muted');
    expect(pluginIcons.length).toBe(3);
  });
});
