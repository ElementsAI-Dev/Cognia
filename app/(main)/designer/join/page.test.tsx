/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import DesignerJoinPage from './page';

const capturedShellProps: Record<string, unknown>[] = [];
const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/components/designer', () => ({
  DesignerShell: (props: Record<string, unknown>) => {
    capturedShellProps.push(props);
    return <div data-testid="designer-shell" />;
  },
}));

describe('DesignerJoinPage', () => {
  beforeEach(() => {
    capturedShellProps.length = 0;
    mockSearchParams.delete('session');
  });

  it('shows missing payload message when session query is absent', () => {
    render(<DesignerJoinPage />);
    expect(screen.getByText('Missing shared session payload.')).toBeInTheDocument();
    expect(screen.queryByTestId('designer-shell')).not.toBeInTheDocument();
  });

  it('renders DesignerShell with restored initial code from shared payload', () => {
    const serialized = JSON.stringify({ document: { content: '<div>shared</div>' } });
    mockSearchParams.set('session', encodeURIComponent(serialized));

    render(<DesignerJoinPage />);

    expect(screen.getByTestId('designer-shell')).toBeInTheDocument();
    expect(capturedShellProps[0]).toMatchObject({
      standalone: true,
      initialCode: '<div>shared</div>',
      sharedSessionSerialized: serialized,
    });
  });

  it('renders DesignerShell with empty initial code for invalid payload', () => {
    mockSearchParams.set('session', 'not-json');

    render(<DesignerJoinPage />);

    expect(screen.getByTestId('designer-shell')).toBeInTheDocument();
    expect(capturedShellProps[0]).toMatchObject({
      initialCode: '',
      sharedSessionSerialized: 'not-json',
    });
  });
});

