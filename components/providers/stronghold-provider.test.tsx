/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { StrongholdProvider, useStrongholdContext, useStrongholdOptional } from './stronghold-provider';

// Mock the useStronghold hook
const mockInitialize = jest.fn();
const mockLock = jest.fn();

jest.mock('@/hooks/native', () => ({
  useStronghold: () => ({
    isInitialized: false,
    isLoading: false,
    isLocked: true,
    error: null,
    initialize: mockInitialize,
    lock: mockLock,
    storeApiKey: jest.fn(),
    getApiKey: jest.fn(),
    removeApiKey: jest.fn(),
    hasApiKey: jest.fn(),
    storeSearchKey: jest.fn(),
    getSearchKey: jest.fn(),
    removeSearchKey: jest.fn(),
    storeCustomKey: jest.fn(),
    getCustomKey: jest.fn(),
    removeCustomKey: jest.fn(),
  }),
}));

describe('StrongholdProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children', () => {
    render(
      <StrongholdProvider>
        <div data-testid="child">Test Child</div>
      </StrongholdProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should provide context to children', () => {
    function TestComponent() {
      const context = useStrongholdContext();
      return <div data-testid="context">{context.isLocked ? 'locked' : 'unlocked'}</div>;
    }

    render(
      <StrongholdProvider>
        <TestComponent />
      </StrongholdProvider>
    );

    expect(screen.getByTestId('context')).toHaveTextContent('locked');
  });

  it('should provide unlock function', async () => {
    mockInitialize.mockResolvedValue(true);

    function TestComponent() {
      const { unlock } = useStrongholdContext();
      return (
        <button onClick={() => unlock('password')} data-testid="unlock">
          Unlock
        </button>
      );
    }

    render(
      <StrongholdProvider>
        <TestComponent />
      </StrongholdProvider>
    );

    await act(async () => {
      screen.getByTestId('unlock').click();
    });

    expect(mockInitialize).toHaveBeenCalledWith('password');
  });

  it('should provide lock function', async () => {
    mockLock.mockResolvedValue(undefined);

    function TestComponent() {
      const { lock } = useStrongholdContext();
      return (
        <button onClick={() => lock()} data-testid="lock">
          Lock
        </button>
      );
    }

    render(
      <StrongholdProvider>
        <TestComponent />
      </StrongholdProvider>
    );

    await act(async () => {
      screen.getByTestId('lock').click();
    });

    expect(mockLock).toHaveBeenCalled();
  });

  it('should initialize showUnlockDialog based on autoPrompt', () => {
    function TestComponent() {
      const { showUnlockDialog } = useStrongholdContext();
      return <div data-testid="dialog">{showUnlockDialog ? 'show' : 'hide'}</div>;
    }

    render(
      <StrongholdProvider autoPrompt={true}>
        <TestComponent />
      </StrongholdProvider>
    );

    expect(screen.getByTestId('dialog')).toHaveTextContent('show');
  });

  it('should hide dialog by default when autoPrompt is false', () => {
    function TestComponent() {
      const { showUnlockDialog } = useStrongholdContext();
      return <div data-testid="dialog">{showUnlockDialog ? 'show' : 'hide'}</div>;
    }

    render(
      <StrongholdProvider autoPrompt={false}>
        <TestComponent />
      </StrongholdProvider>
    );

    expect(screen.getByTestId('dialog')).toHaveTextContent('hide');
  });
});

describe('useStrongholdOptional', () => {
  it('should return null when used outside provider', () => {
    function TestComponent() {
      const context = useStrongholdOptional();
      return <div data-testid="optional">{context === null ? 'null' : 'context'}</div>;
    }

    render(<TestComponent />);
    expect(screen.getByTestId('optional')).toHaveTextContent('null');
  });

  it('should return context when used inside provider', () => {
    function TestComponent() {
      const context = useStrongholdOptional();
      return <div data-testid="optional">{context === null ? 'null' : 'context'}</div>;
    }

    render(
      <StrongholdProvider>
        <TestComponent />
      </StrongholdProvider>
    );
    expect(screen.getByTestId('optional')).toHaveTextContent('context');
  });
});

describe('useStrongholdContext', () => {
  it('should throw error when used outside provider', () => {
    function TestComponent() {
      useStrongholdContext();
      return <div>Test</div>;
    }

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => render(<TestComponent />)).toThrow(
      'useStrongholdContext must be used within a StrongholdProvider'
    );

    consoleSpy.mockRestore();
  });
});
