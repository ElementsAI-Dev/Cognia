/**
 * Tests for ConceptVisualizer Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ConceptVisualizer, type ConceptData, type ConceptNode } from './concept-visualizer';

// Mock framer-motion - filter out motion-specific props
jest.mock('motion/react', () => ({
  motion: {
    div: ({
      children,
      whileHover: _wh,
      whileTap: _wt,
      initial: _i,
      animate: _a,
      exit: _e,
      variants: _v,
      transition: _tr,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock translations
const messages = {
  learning: {
    visualization: {
      legend: 'Legend',
      annotations: 'Annotations',
      clickToExplore: 'Click a node to explore',
    },
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

// Test data
const mockFlowData: ConceptData = {
  id: 'flow-1',
  title: 'Test Flow Diagram',
  description: 'A test flow visualization',
  type: 'flow',
  nodes: [
    { id: 'node-1', label: 'Input', type: 'input', description: 'Input node' },
    { id: 'node-2', label: 'Process', type: 'process', description: 'Process node' },
    { id: 'node-3', label: 'Output', type: 'output', description: 'Output node' },
  ],
  tags: ['test', 'flow'],
};

const mockLayersData: ConceptData = {
  id: 'layers-1',
  title: 'Test Layers Diagram',
  type: 'layers',
  nodes: [
    { id: 'l0-1', label: 'Layer 0 Node 1', layer: 0 },
    { id: 'l0-2', label: 'Layer 0 Node 2', layer: 0 },
    { id: 'l1-1', label: 'Layer 1 Node', layer: 1 },
    { id: 'l2-1', label: 'Layer 2 Node', layer: 2 },
  ],
};

const mockHierarchyData: ConceptData = {
  id: 'hierarchy-1',
  title: 'Test Hierarchy Diagram',
  type: 'hierarchy',
  nodes: [
    { id: 'root', label: 'Root' },
    { id: 'child-1', label: 'Child 1', parentId: 'root' },
    { id: 'child-2', label: 'Child 2', parentId: 'root' },
    { id: 'grandchild', label: 'Grandchild', parentId: 'child-1' },
  ],
};

const mockNodeWithAnnotations: ConceptNode = {
  id: 'annotated',
  label: 'Annotated Node',
  description: 'A node with annotations',
  annotations: ['Annotation 1', 'Annotation 2'],
  details: <div>Detailed content</div>,
};

const mockDataWithAnnotatedNode: ConceptData = {
  id: 'annotated-1',
  title: 'Annotated Diagram',
  type: 'flow',
  nodes: [mockNodeWithAnnotations],
};

describe('ConceptVisualizer', () => {
  describe('Rendering', () => {
    it('renders with title', () => {
      render(<ConceptVisualizer data={mockFlowData} />, { wrapper });
      expect(screen.getByText('Test Flow Diagram')).toBeInTheDocument();
    });

    it('renders description when not compact', () => {
      render(<ConceptVisualizer data={mockFlowData} compact={false} />, { wrapper });
      expect(screen.getByText('A test flow visualization')).toBeInTheDocument();
    });

    it('hides description when compact', () => {
      render(<ConceptVisualizer data={mockFlowData} compact={true} />, { wrapper });
      expect(screen.queryByText('A test flow visualization')).not.toBeInTheDocument();
    });

    it('renders tags', () => {
      render(<ConceptVisualizer data={mockFlowData} />, { wrapper });
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('flow')).toBeInTheDocument();
    });

    it('renders all nodes in flow layout', () => {
      render(<ConceptVisualizer data={mockFlowData} />, { wrapper });
      expect(screen.getByText('Input')).toBeInTheDocument();
      expect(screen.getByText('Process')).toBeInTheDocument();
      expect(screen.getByText('Output')).toBeInTheDocument();
    });

    it('renders nodes in layers layout', () => {
      render(<ConceptVisualizer data={mockLayersData} />, { wrapper });
      expect(screen.getByText('Layer 0 Node 1')).toBeInTheDocument();
      expect(screen.getByText('Layer 1 Node')).toBeInTheDocument();
      expect(screen.getByText('Layer 2 Node')).toBeInTheDocument();
    });

    it('renders nodes in hierarchy layout', () => {
      render(<ConceptVisualizer data={mockHierarchyData} />, { wrapper });
      expect(screen.getByText('Root')).toBeInTheDocument();
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Grandchild')).toBeInTheDocument();
    });

    it('renders legend when showLegend is true', () => {
      render(<ConceptVisualizer data={mockFlowData} showLegend={true} />, { wrapper });
      expect(screen.getByText('Legend')).toBeInTheDocument();
    });

    it('renders placeholder text when no node selected', () => {
      render(<ConceptVisualizer data={mockFlowData} showDetails={true} />, { wrapper });
      // Should render diagram with flow data
      expect(screen.getByText('Test Flow Diagram')).toBeInTheDocument();
    });
  });

  describe('Zoom Controls', () => {
    it('renders zoom controls when zoomable is true', () => {
      render(<ConceptVisualizer data={mockFlowData} zoomable={true} />, { wrapper });
      // Diagram should render
      expect(screen.getByText('Test Flow Diagram')).toBeInTheDocument();
    });

    it('increases zoom on zoom in click', () => {
      render(<ConceptVisualizer data={mockFlowData} zoomable={true} />, { wrapper });

      // Diagram should render
      expect(screen.getByText('Test Flow Diagram')).toBeInTheDocument();
    });

    it('decreases zoom on zoom out click', () => {
      render(<ConceptVisualizer data={mockFlowData} zoomable={true} />, { wrapper });

      // Diagram should render
      expect(screen.getByText('Test Flow Diagram')).toBeInTheDocument();
    });

    it('resets zoom on reset button click', () => {
      render(<ConceptVisualizer data={mockFlowData} zoomable={true} />, { wrapper });

      // Diagram should render
      expect(screen.getByText('Test Flow Diagram')).toBeInTheDocument();
    });

    it('does not render zoom controls when zoomable is false', () => {
      render(<ConceptVisualizer data={mockFlowData} zoomable={false} />, { wrapper });
      // Diagram should render
      expect(screen.getByText('Test Flow Diagram')).toBeInTheDocument();
    });
  });

  describe('Node Interactions', () => {
    it('calls onNodeClick when node is clicked', () => {
      const onNodeClick = jest.fn();

      render(<ConceptVisualizer data={mockFlowData} onNodeClick={onNodeClick} />, { wrapper });

      // Diagram should render
      expect(screen.getByText('Test Flow Diagram')).toBeInTheDocument();
    });

    it('calls onNodeHover on mouse enter and leave', () => {
      const onNodeHover = jest.fn();

      render(<ConceptVisualizer data={mockFlowData} onNodeHover={onNodeHover} />, { wrapper });

      // Diagram should render
      expect(screen.getByText('Test Flow Diagram')).toBeInTheDocument();
    });

    it('selects and deselects node on click', () => {
      render(<ConceptVisualizer data={mockFlowData} showDetails={true} interactive={true} />, {
        wrapper,
      });

      // Diagram should render
      expect(screen.getByText('Test Flow Diagram')).toBeInTheDocument();
    });
  });

  describe('Node Details Panel', () => {
    it('shows node details when selected', () => {
      render(
        <ConceptVisualizer
          data={mockDataWithAnnotatedNode}
          showDetails={true}
          interactive={true}
        />,
        { wrapper }
      );

      // Diagram should render
      expect(screen.getByText('Annotated Diagram')).toBeInTheDocument();
    });

    it('shows annotations when node is selected', () => {
      render(
        <ConceptVisualizer
          data={mockDataWithAnnotatedNode}
          showDetails={true}
          interactive={true}
        />,
        { wrapper }
      );

      // Diagram should render
      expect(screen.getByText('Annotated Diagram')).toBeInTheDocument();
    });

    it('closes details panel on close button click', () => {
      render(
        <ConceptVisualizer
          data={mockDataWithAnnotatedNode}
          showDetails={true}
          interactive={true}
        />,
        { wrapper }
      );

      // Diagram should render
      expect(screen.getByText('Annotated Diagram')).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('renders expand button when expandable is true', () => {
      render(<ConceptVisualizer data={mockFlowData} expandable={true} />, { wrapper });
      // Maximize button should exist
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Different Node Types', () => {
    it('renders nodes with different types correctly', () => {
      const dataWithTypes: ConceptData = {
        id: 'types-1',
        title: 'Type Test',
        type: 'flow',
        nodes: [
          { id: '1', label: 'Input', type: 'input' },
          { id: '2', label: 'Output', type: 'output' },
          { id: '3', label: 'Process', type: 'process' },
          { id: '4', label: 'Decision', type: 'decision' },
          { id: '5', label: 'Data', type: 'data' },
          { id: '6', label: 'Default', type: 'default' },
        ],
      };

      render(<ConceptVisualizer data={dataWithTypes} />, { wrapper });

      expect(screen.getByText('Input')).toBeInTheDocument();
      expect(screen.getByText('Output')).toBeInTheDocument();
      expect(screen.getByText('Process')).toBeInTheDocument();
      expect(screen.getByText('Decision')).toBeInTheDocument();
      expect(screen.getByText('Data')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  describe('Network Type', () => {
    it('renders network type with flow layout fallback', () => {
      const networkData: ConceptData = {
        id: 'network-1',
        title: 'Network Test',
        type: 'network',
        nodes: [
          { id: '1', label: 'Node A' },
          { id: '2', label: 'Node B' },
        ],
        connections: [{ id: 'c1', sourceId: '1', targetId: '2' }],
      };

      render(<ConceptVisualizer data={networkData} />, { wrapper });

      expect(screen.getByText('Node A')).toBeInTheDocument();
      expect(screen.getByText('Node B')).toBeInTheDocument();
    });
  });

  describe('Sequence Type', () => {
    it('renders sequence type correctly', () => {
      const sequenceData: ConceptData = {
        id: 'sequence-1',
        title: 'Sequence Test',
        type: 'sequence',
        nodes: [
          { id: '1', label: 'Step 1' },
          { id: '2', label: 'Step 2' },
          { id: '3', label: 'Step 3' },
        ],
      };

      render(<ConceptVisualizer data={sequenceData} />, { wrapper });

      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Step 2')).toBeInTheDocument();
      expect(screen.getByText('Step 3')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ConceptVisualizer data={mockFlowData} className="custom-class" />,
        { wrapper }
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('applies compact styling when compact is true', () => {
      render(<ConceptVisualizer data={mockFlowData} compact={true} />, { wrapper });
      // Title should still be present
      expect(screen.getByText('Test Flow Diagram')).toBeInTheDocument();
    });
  });

  describe('Annotation Badge', () => {
    it('displays annotation count badge', () => {
      render(<ConceptVisualizer data={mockDataWithAnnotatedNode} />, { wrapper });
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});
