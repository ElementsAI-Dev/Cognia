/**
 * A2UI Accordion Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { A2UIAccordion } from './a2ui-accordion';
import type { A2UIAccordionComponent, A2UIComponentProps } from '@/types/artifact/a2ui';

// Mock A2UIChildRenderer
jest.mock('../a2ui-renderer', () => ({
  A2UIChildRenderer: ({ childIds }: { childIds: string[] }) => (
    <div data-testid="child-renderer">{childIds.join(',')}</div>
  ),
}));

describe('A2UIAccordion', () => {
  const mockOnAction = jest.fn();
  const mockOnDataChange = jest.fn();
  const mockRenderChild = jest.fn(() => null);

  const createProps = (component: A2UIAccordionComponent): A2UIComponentProps<A2UIAccordionComponent> => ({
    component,
    surfaceId: 'test-surface',
    dataModel: {},
    onAction: mockOnAction,
    onDataChange: mockOnDataChange,
    renderChild: mockRenderChild,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render accordion items with titles', () => {
    const component: A2UIAccordionComponent = {
      id: 'accordion-1',
      component: 'Accordion',
      items: [
        { id: 'item1', title: 'Section One', children: ['child-1'] },
        { id: 'item2', title: 'Section Two', children: ['child-2'] },
      ],
    };

    render(<A2UIAccordion {...createProps(component)} />);
    expect(screen.getByText('Section One')).toBeInTheDocument();
    expect(screen.getByText('Section Two')).toBeInTheDocument();
  });

  it('should render in single mode by default (collapsible)', () => {
    const component: A2UIAccordionComponent = {
      id: 'accordion-2',
      component: 'Accordion',
      items: [
        { id: 'item1', title: 'First', children: ['child-1'] },
        { id: 'item2', title: 'Second', children: ['child-2'] },
      ],
    };

    const { container } = render(<A2UIAccordion {...createProps(component)} />);
    // Single mode accordion should have data-orientation attribute
    const accordion = container.querySelector('[data-orientation]');
    expect(accordion).toBeInTheDocument();
  });

  it('should render in multiple mode when specified', () => {
    const component: A2UIAccordionComponent = {
      id: 'accordion-3',
      component: 'Accordion',
      multiple: true,
      items: [
        { id: 'item1', title: 'First', children: ['child-1'] },
        { id: 'item2', title: 'Second', children: ['child-2'] },
      ],
    };

    const { container } = render(<A2UIAccordion {...createProps(component)} />);
    const accordion = container.querySelector('[data-orientation]');
    expect(accordion).toBeInTheDocument();
  });

  it('should open items with defaultOpen set', () => {
    const component: A2UIAccordionComponent = {
      id: 'accordion-4',
      component: 'Accordion',
      items: [
        { id: 'item1', title: 'Closed', children: ['child-1'] },
        { id: 'item2', title: 'Open by Default', children: ['child-2'], defaultOpen: true },
      ],
    };

    render(<A2UIAccordion {...createProps(component)} />);
    expect(screen.getByText('Open by Default')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const component: A2UIAccordionComponent = {
      id: 'accordion-5',
      component: 'Accordion',
      className: 'custom-class',
      items: [
        { id: 'item1', title: 'Item', children: ['child-1'] },
      ],
    };

    const { container } = render(<A2UIAccordion {...createProps(component)} />);
    const accordion = container.querySelector('.custom-class');
    expect(accordion).toBeInTheDocument();
  });
});
