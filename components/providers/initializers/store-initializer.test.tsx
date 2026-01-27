'use client';

import React from 'react';
import { render } from '@testing-library/react';
import { StoreInitializer } from './store-initializer';

const mockUnsubscribe = jest.fn();
jest.mock('@/stores/project', () => ({
  initProjectActivitySubscriber: jest.fn(() => mockUnsubscribe),
}));

import { initProjectActivitySubscriber } from '@/stores/project';

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
  });

  it('calls unsubscribe on unmount', () => {
    const { unmount } = render(<StoreInitializer />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('only initializes once', () => {
    render(<StoreInitializer />);
    expect(initProjectActivitySubscriber).toHaveBeenCalledTimes(1);
  });
});
