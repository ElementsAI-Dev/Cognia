/**
 * Test utilities for rendering components with required providers
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * All providers wrapper for testing
 */
function AllProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      {children}
    </TooltipProvider>
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
