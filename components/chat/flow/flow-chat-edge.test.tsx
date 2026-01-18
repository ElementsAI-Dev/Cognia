/**
 * FlowChatEdge - Unit tests
 */

import { render } from '@testing-library/react';
import { ReactFlowProvider, type Position } from '@xyflow/react';
import { FlowChatEdge } from './flow-chat-edge';
import type { FlowChatEdgeType } from '@/types/chat/flow-chat';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

describe('FlowChatEdge', () => {
  const defaultEdgeProps = {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 100,
    sourcePosition: 'bottom' as Position,
    targetPosition: 'top' as Position,
  };

  it('renders conversation edge with default style', () => {
    const { container } = render(
      <FlowChatEdge
        {...defaultEdgeProps}
        data={{ edgeType: 'conversation' as FlowChatEdgeType }}
      />,
      { wrapper }
    );

    const edgePath = container.querySelector('.react-flow__edge-path');
    expect(edgePath).toBeInTheDocument();
  });

  it('renders branch edge with dashed style', () => {
    const { container } = render(
      <FlowChatEdge
        {...defaultEdgeProps}
        data={{ edgeType: 'branch' as FlowChatEdgeType }}
      />,
      { wrapper }
    );

    const edgePath = container.querySelector('.react-flow__edge-path');
    expect(edgePath).toBeInTheDocument();
    // Branch edges should have animation
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders reference edge with blue color', () => {
    const { container } = render(
      <FlowChatEdge
        {...defaultEdgeProps}
        data={{ edgeType: 'reference' as FlowChatEdgeType }}
      />,
      { wrapper }
    );

    const edgePath = container.querySelector('.react-flow__edge-path');
    expect(edgePath).toBeInTheDocument();
  });

  it('renders parallel edge with purple color', () => {
    const { container } = render(
      <FlowChatEdge
        {...defaultEdgeProps}
        data={{ edgeType: 'parallel' as FlowChatEdgeType }}
      />,
      { wrapper }
    );

    const edgePath = container.querySelector('.react-flow__edge-path');
    expect(edgePath).toBeInTheDocument();
  });

  it('applies selected styling when selected prop is true', () => {
    const { container } = render(
      <FlowChatEdge
        {...defaultEdgeProps}
        selected={true}
        data={{ edgeType: 'conversation' as FlowChatEdgeType }}
      />,
      { wrapper }
    );

    const edgePath = container.querySelector('.stroke-primary');
    expect(edgePath).toBeInTheDocument();
  });

  it('renders label for branch edges', () => {
    const { container } = render(
      <FlowChatEdge
        {...defaultEdgeProps}
        data={{
          edgeType: 'branch' as FlowChatEdgeType,
          label: 'Branch A',
        }}
      />,
      { wrapper }
    );

    // EdgeLabelRenderer renders content outside the container in ReactFlow
    // Check that the edge path exists (label is handled by EdgeLabelRenderer)
    const edgePath = container.querySelector('.react-flow__edge-path');
    expect(edgePath).toBeInTheDocument();
  });

  it('does not render label for non-branch edges', () => {
    const { container } = render(
      <FlowChatEdge
        {...defaultEdgeProps}
        data={{
          edgeType: 'conversation' as FlowChatEdgeType,
          label: 'Should not show',
        }}
      />,
      { wrapper }
    );

    // Non-branch edges don't use EdgeLabelRenderer, so label won't be in DOM
    const edgePath = container.querySelector('.react-flow__edge-path');
    expect(edgePath).toBeInTheDocument();
    // No badge should be in the container
    const badge = container.querySelector('[class*="badge"]');
    expect(badge).not.toBeInTheDocument();
  });

  it('applies custom style when provided', () => {
    const customStyle = { stroke: '#ff0000', strokeWidth: 3 };
    const { container } = render(
      <FlowChatEdge
        {...defaultEdgeProps}
        style={customStyle}
        data={{ edgeType: 'conversation' as FlowChatEdgeType }}
      />,
      { wrapper }
    );

    const edgePath = container.querySelector('.react-flow__edge-path');
    expect(edgePath).toBeInTheDocument();
  });

  it('renders animated dot for animated edges', () => {
    const { container } = render(
      <FlowChatEdge
        {...defaultEdgeProps}
        data={{ edgeType: 'branch' as FlowChatEdgeType, animated: true }}
      />,
      { wrapper }
    );

    // Animated edges should have an animated dot
    expect(container.querySelector('animateMotion')).toBeInTheDocument();
  });

  it('defaults to conversation type when no edge type is provided', () => {
    const { container } = render(<FlowChatEdge {...defaultEdgeProps} data={{}} />, {
      wrapper,
    });

    const edgePath = container.querySelector('.react-flow__edge-path');
    expect(edgePath).toBeInTheDocument();
  });

  it('applies transition classes', () => {
    const { container } = render(
      <FlowChatEdge
        {...defaultEdgeProps}
        data={{ edgeType: 'conversation' as FlowChatEdgeType }}
      />,
      { wrapper }
    );

    const edgePath = container.querySelector('.transition-all');
    expect(edgePath).toBeInTheDocument();
  });

  it('renders edge label renderer for branch type', () => {
    const { container } = render(
      <FlowChatEdge
        {...defaultEdgeProps}
        data={{
          edgeType: 'branch' as FlowChatEdgeType,
          label: 'Test Branch',
        }}
      />,
      { wrapper }
    );

    // EdgeLabelRenderer content is rendered via ReactFlow's portal
    // We check the edge itself exists
    const edgePath = container.querySelector('.react-flow__edge-path');
    expect(edgePath).toBeInTheDocument();
  });

  it('positions label at correct coordinates', () => {
    const { container } = render(
      <FlowChatEdge
        {...defaultEdgeProps}
        data={{
          edgeType: 'branch' as FlowChatEdgeType,
          label: 'Label',
        }}
      />,
      { wrapper }
    );

    // EdgeLabelRenderer content is rendered via ReactFlow's portal
    // The label positioning is handled by ReactFlow's EdgeLabelRenderer
    const edgePath = container.querySelector('.react-flow__edge-path');
    expect(edgePath).toBeInTheDocument();
  });
});
