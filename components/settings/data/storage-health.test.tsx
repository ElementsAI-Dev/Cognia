/**
 * StorageHealthDisplay Component Tests
 * Basic rendering tests
 */

import { render } from '@testing-library/react';
import { StorageHealthDisplay } from './storage-health';
import type { StorageHealth } from '@/lib/storage';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockFormatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

describe('StorageHealthDisplay', () => {
  const healthyHealth: StorageHealth = {
    status: 'healthy',
    usagePercent: 15,
    issues: [],
    recommendations: [],
  };

  const warningHealth: StorageHealth = {
    status: 'warning',
    usagePercent: 75,
    issues: [
      { type: 'quota_warning', severity: 'medium', message: 'Storage usage is high' },
    ],
    recommendations: [
      { action: 'cleanup', description: 'Clear cache data', priority: 'medium', estimatedSavings: 1024 },
    ],
  };

  const criticalHealth: StorageHealth = {
    status: 'critical',
    usagePercent: 95,
    issues: [
      { type: 'quota_critical', severity: 'high', message: 'Storage quota exceeded' },
    ],
    recommendations: [],
  };

  it('should render with healthy status', () => {
    const { container } = render(<StorageHealthDisplay health={healthyHealth} formatBytes={mockFormatBytes} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with warning status', () => {
    const { container } = render(<StorageHealthDisplay health={warningHealth} formatBytes={mockFormatBytes} />);
    expect(container).toBeInTheDocument();
  });

  it('should render with critical status', () => {
    const { container } = render(<StorageHealthDisplay health={criticalHealth} formatBytes={mockFormatBytes} />);
    expect(container).toBeInTheDocument();
  });

  it('should accept className prop', () => {
    const { container } = render(
      <StorageHealthDisplay 
        health={healthyHealth} 
        formatBytes={mockFormatBytes}
        className="custom-class"
      />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
