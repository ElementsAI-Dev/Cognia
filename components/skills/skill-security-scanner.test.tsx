/**
 * SkillSecurityScanner Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SkillSecurityScanner } from './skill-security-scanner';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the useSkillSecurity hook
const mockScanInstalled = jest.fn();
const mockScanPath = jest.fn();
const mockClearError = jest.fn();

jest.mock('@/hooks/skills/use-skill-security', () => ({
  useSkillSecurity: () => ({
    isScanning: false,
    lastReport: null,
    error: null,
    scanInstalled: mockScanInstalled,
    scanPath: mockScanPath,
    clearError: mockClearError,
  }),
  getSeverityColor: (severity: string) => `bg-${severity}`,
  getSeverityLabel: (severity: string) => severity.charAt(0).toUpperCase() + severity.slice(1),
  getCategoryLabel: (category: string) => category.replace(/_/g, ' '),
  getRiskScoreColor: (score: number) => (score > 50 ? 'text-red-600' : 'text-green-600'),
}));

const mockReport = {
  skillId: 'test-skill',
  skillName: 'Test Skill',
  scannedPath: '/path/to/skill',
  scannedAt: Date.now(),
  durationMs: 150,
  summary: {
    filesScanned: 5,
    totalFindings: 2,
    critical: 1,
    high: 1,
    medium: 0,
    low: 0,
    info: 0,
    isSafe: false,
    riskScore: 40,
  },
  findings: [
    {
      ruleId: 'SEC010',
      title: 'JavaScript eval()',
      description: 'eval() executes arbitrary JavaScript code.',
      severity: 'critical' as const,
      category: 'code_injection' as const,
      filePath: 'index.js',
      line: 10,
      column: 5,
      snippet: '> 10 | eval(userInput)',
      suggestion: 'Never use eval().',
    },
    {
      ruleId: 'SEC001',
      title: 'Shell Command Execution',
      description: 'Direct shell command execution.',
      severity: 'high' as const,
      category: 'command_execution' as const,
      filePath: 'script.js',
      line: 20,
      column: 1,
      snippet: '> 20 | exec("ls")',
      suggestion: 'Avoid shell commands.',
    },
  ],
};

describe('SkillSecurityScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render scan button when no skill directory provided', () => {
    render(<SkillSecurityScanner />);
    
    const scanButton = screen.getByRole('button');
    expect(scanButton).toBeDisabled();
  });

  it('should render scan button enabled with skill directory', () => {
    render(<SkillSecurityScanner skillDirectory="test-skill" />);
    
    const scanButton = screen.getByRole('button');
    expect(scanButton).not.toBeDisabled();
  });

  it('should show skill name when provided', () => {
    render(<SkillSecurityScanner skillDirectory="test-skill" skillName="My Skill" />);
    
    expect(screen.getByText(/My Skill/)).toBeInTheDocument();
  });

  it('should call scanInstalled when clicking scan with directory', async () => {
    mockScanInstalled.mockResolvedValue(mockReport);
    
    render(<SkillSecurityScanner skillDirectory="test-skill" />);
    
    const scanButton = screen.getByRole('button');
    fireEvent.click(scanButton);
    
    await waitFor(() => {
      expect(mockScanInstalled).toHaveBeenCalledWith('test-skill');
    });
  });

  it('should call scanPath when clicking scan with path', async () => {
    mockScanPath.mockResolvedValue(mockReport);
    
    render(<SkillSecurityScanner skillPath="/path/to/skill" />);
    
    const scanButton = screen.getByRole('button');
    fireEvent.click(scanButton);
    
    await waitFor(() => {
      expect(mockScanPath).toHaveBeenCalledWith('/path/to/skill');
    });
  });

  it('should call onScanComplete callback after scan', async () => {
    const onScanComplete = jest.fn();
    mockScanInstalled.mockResolvedValue(mockReport);
    
    render(
      <SkillSecurityScanner 
        skillDirectory="test-skill" 
        onScanComplete={onScanComplete}
      />
    );
    
    const scanButton = screen.getByRole('button');
    fireEvent.click(scanButton);
    
    await waitFor(() => {
      expect(onScanComplete).toHaveBeenCalledWith(mockReport);
    });
  });

  it('should render empty state before scanning', () => {
    render(<SkillSecurityScanner skillDirectory="test-skill" />);
    
    expect(screen.getByText('clickToScan')).toBeInTheDocument();
  });
});

describe('SkillSecurityScanner with report', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with custom className', () => {
    const { container } = render(<SkillSecurityScanner skillDirectory="test-skill" className="custom-class" />);
    
    // The root div should have the custom class
    const rootDiv = container.firstChild;
    expect(rootDiv).toHaveClass('custom-class');
  });

  it('should prefer skillDirectory over skillPath', async () => {
    mockScanInstalled.mockResolvedValue(mockReport);
    
    render(
      <SkillSecurityScanner 
        skillDirectory="test-dir" 
        skillPath="/path/to/skill"
      />
    );
    
    const scanButton = screen.getByRole('button');
    fireEvent.click(scanButton);
    
    await waitFor(() => {
      expect(mockScanInstalled).toHaveBeenCalledWith('test-dir');
      expect(mockScanPath).not.toHaveBeenCalled();
    });
  });
});
