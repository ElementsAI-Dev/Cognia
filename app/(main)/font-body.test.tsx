/**
 * @jest-environment jsdom
 */

import React from 'react';
import { isValidElement } from 'react';

jest.mock('next/font/google', () => ({
  Geist: jest.fn(() => ({ variable: '--font-geist-sans' })),
  Geist_Mono: jest.fn(() => ({ variable: '--font-geist-mono' })),
}));

import { FontBody } from './font-body';

describe('font-body', () => {
  it('renders children with font classes', () => {
    const child = <div data-testid="child">child</div>;
    const result = FontBody({ children: child });

    expect(isValidElement(result)).toBe(true);
    expect(result.type).toBe('body');
    expect(result.props.className).toContain('--font-geist-sans');
    expect(result.props.className).toContain('--font-geist-mono');
    expect(result.props.children).toBe(child);
  });
});
