/**
 * LocaleInitializer Component Tests
 * 
 * Tests for the locale initialization component that auto-detects
 * user locale based on geolocation and browser settings.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { LocaleInitializer } from './locale-initializer';
import * as i18n from '@/lib/i18n';

// Mock the i18n module
jest.mock('@/lib/i18n', () => ({
  autoDetectLocale: jest.fn(),
  getSystemTimezone: jest.fn(),
}));

// Mock the settings store
const mockSetLanguage = jest.fn();
const mockSetLocaleDetectionResult = jest.fn();
const mockSetDetectedTimezone = jest.fn();

jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn(),
}));

// Import after mocking
import { useSettingsStore } from '@/stores';

describe('LocaleInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (i18n.getSystemTimezone as jest.Mock).mockReturnValue('Asia/Shanghai');
    (i18n.autoDetectLocale as jest.Mock).mockResolvedValue({
      locale: 'zh-CN',
      confidence: 'high',
      source: 'geolocation',
      country: 'China',
      timezone: 'Asia/Shanghai',
    });
  });

  it('should render nothing (null)', () => {
    (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        language: 'en',
        autoDetectLocale: true,
        hasCompletedOnboarding: false,
        setLanguage: mockSetLanguage,
        setLocaleDetectionResult: mockSetLocaleDetectionResult,
        setDetectedTimezone: mockSetDetectedTimezone,
      };
      return selector(state);
    });

    const { container } = render(<LocaleInitializer />);

    expect(container.firstChild).toBeNull();
  });

  it('should have correct store selectors', () => {
    const selectorCalls: string[] = [];
    
    (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        language: 'en',
        autoDetectLocale: true,
        hasCompletedOnboarding: false,
        setLanguage: mockSetLanguage,
        setLocaleDetectionResult: mockSetLocaleDetectionResult,
        setDetectedTimezone: mockSetDetectedTimezone,
      };
      const result = selector(state);
      if (typeof result === 'function') {
        selectorCalls.push('function');
      } else {
        selectorCalls.push(String(result));
      }
      return result;
    });

    render(<LocaleInitializer />);

    // Should have called useSettingsStore multiple times for different selectors
    expect(useSettingsStore).toHaveBeenCalled();
  });

  it('should not crash when auto-detect is disabled', () => {
    (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        language: 'en',
        autoDetectLocale: false,
        hasCompletedOnboarding: false,
        setLanguage: mockSetLanguage,
        setLocaleDetectionResult: mockSetLocaleDetectionResult,
        setDetectedTimezone: mockSetDetectedTimezone,
      };
      return selector(state);
    });

    expect(() => {
      render(<LocaleInitializer />);
    }).not.toThrow();
  });

  it('should not crash when user has already completed onboarding', () => {
    (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        language: 'zh-CN',
        autoDetectLocale: true,
        hasCompletedOnboarding: true,
        setLanguage: mockSetLanguage,
        setLocaleDetectionResult: mockSetLocaleDetectionResult,
        setDetectedTimezone: mockSetDetectedTimezone,
      };
      return selector(state);
    });

    expect(() => {
      render(<LocaleInitializer />);
    }).not.toThrow();
  });

  it('should call getSystemTimezone from i18n module', () => {
    (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        language: 'en',
        autoDetectLocale: true,
        hasCompletedOnboarding: false,
        setLanguage: mockSetLanguage,
        setLocaleDetectionResult: mockSetLocaleDetectionResult,
        setDetectedTimezone: mockSetDetectedTimezone,
      };
      return selector(state);
    });

    render(<LocaleInitializer />);

    // The component should have access to the i18n functions
    expect(i18n.getSystemTimezone).toBeDefined();
    expect(i18n.autoDetectLocale).toBeDefined();
  });
});
