/**
 * Test utilities for rendering components with required providers
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { TooltipProvider } from '@/components/ui/tooltip';

// Import English messages for testing
import enMessages from '@/lib/i18n/messages/en.json';

/**
 * All providers wrapper for testing
 */
function AllProviders({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </NextIntlClientProvider>
  );
}

/**
 * Custom render function that wraps components with all necessary providers
 */
function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { renderWithProviders, AllProviders };
export * from '@testing-library/react';
