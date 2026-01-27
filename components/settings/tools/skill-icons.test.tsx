'use client';

import React from 'react';
import { render } from '@testing-library/react';
import { SKILL_CATEGORY_ICONS } from './skill-icons';
import type { SkillCategory } from '@/types/system/skill';

describe('SKILL_CATEGORY_ICONS', () => {
  const categories: SkillCategory[] = [
    'creative-design',
    'development',
    'enterprise',
    'productivity',
    'data-analysis',
    'communication',
    'meta',
    'custom',
  ];

  it('has icons for all skill categories', () => {
    categories.forEach((category) => {
      expect(SKILL_CATEGORY_ICONS[category]).toBeDefined();
    });
  });

  it('renders creative-design icon', () => {
    const { container } = render(<>{SKILL_CATEGORY_ICONS['creative-design']}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders development icon', () => {
    const { container } = render(<>{SKILL_CATEGORY_ICONS['development']}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders enterprise icon', () => {
    const { container } = render(<>{SKILL_CATEGORY_ICONS['enterprise']}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders productivity icon', () => {
    const { container } = render(<>{SKILL_CATEGORY_ICONS['productivity']}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders data-analysis icon', () => {
    const { container } = render(<>{SKILL_CATEGORY_ICONS['data-analysis']}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders communication icon', () => {
    const { container } = render(<>{SKILL_CATEGORY_ICONS['communication']}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders meta icon', () => {
    const { container } = render(<>{SKILL_CATEGORY_ICONS['meta']}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    const { container } = render(<>{SKILL_CATEGORY_ICONS['custom']}</>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('icons have correct size classes', () => {
    const { container } = render(<>{SKILL_CATEGORY_ICONS['development']}</>);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.classList.contains('h-4')).toBe(true);
    expect(svg?.classList.contains('w-4')).toBe(true);
  });
});
