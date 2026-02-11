'use client';

import React from 'react';
import { render } from '@testing-library/react';
import { StoreInitializer } from './store-initializer';

const mockUnsubscribe = jest.fn();
const mockUnsubscribeMessageCount = jest.fn();
jest.mock('@/stores/project', () => ({
  initProjectActivitySubscriber: jest.fn(() => mockUnsubscribe),
  initSessionMessageCountSubscriber: jest.fn(() => mockUnsubscribeMessageCount),
}));

import { initProjectActivitySubscriber, initSessionMessageCountSubscriber } from '@/stores/project';

describe('StoreInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null', () => {
    const { container } = render(<StoreInitializer />);
    expect(container.firstChild).toBeNull();
  });

  it('calls initProjectActivitySubscriber on mount', () => {
    render(<StoreInitializer />);
    expect(initProjectActivitySubscriber).toHaveBeenCalled();
    expect(initSessionMessageCountSubscriber).toHaveBeenCalled();
  });

  it('calls unsubscribe on unmount', () => {
    const { unmount } = render(<StoreInitializer />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockUnsubscribeMessageCount).toHaveBeenCalled();
  });

  it('only initializes once', () => {
    render(<StoreInitializer />);
    expect(initProjectActivitySubscriber).toHaveBeenCalledTimes(1);
    expect(initSessionMessageCountSubscriber).toHaveBeenCalledTimes(1);
  });
});
