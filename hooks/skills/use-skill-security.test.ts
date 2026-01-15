/**
 * useSkillSecurity Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import {
  useSkillSecurity,
  getSeverityColor,
  getSeverityLabel,
  getCategoryLabel,
  getRiskScoreColor,
} from './use-skill-security';

// Mock the native skill module
jest.mock('@/lib/native/skill', () => ({
  isNativeSkillAvailable: jest.fn(() => true),
  scanInstalledSkill: jest.fn(),
  scanSkillPath: jest.fn(),
  getSecurityRuleCount: jest.fn(),
}));

import * as nativeSkill from '@/lib/native/skill';

const mockScanReport = {
  skillId: 'test-skill',
  skillName: 'Test Skill',
  scannedPath: '/path/to/skill',
  scannedAt: Date.now(),
  durationMs: 150,
  summary: {
    filesScanned: 5,
    totalFindings: 3,
    critical: 1,
    high: 1,
    medium: 1,
    low: 0,
    info: 0,
    isSafe: false,
    riskScore: 48,
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
  ],
};

describe('useSkillSecurity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (nativeSkill.isNativeSkillAvailable as jest.Mock).mockReturnValue(true);
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useSkillSecurity());

    expect(result.current.isScanning).toBe(false);
    expect(result.current.lastReport).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.ruleCount).toBeNull();
  });

  it('should scan installed skill successfully', async () => {
    (nativeSkill.scanInstalledSkill as jest.Mock).mockResolvedValue(mockScanReport);

    const { result } = renderHook(() => useSkillSecurity());

    let report;
    await act(async () => {
      report = await result.current.scanInstalled('test-skill');
    });

    expect(report).toEqual(mockScanReport);
    expect(result.current.lastReport).toEqual(mockScanReport);
    expect(result.current.isScanning).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should scan path successfully', async () => {
    (nativeSkill.scanSkillPath as jest.Mock).mockResolvedValue(mockScanReport);

    const { result } = renderHook(() => useSkillSecurity());

    let report;
    await act(async () => {
      report = await result.current.scanPath('/path/to/skill');
    });

    expect(report).toEqual(mockScanReport);
    expect(result.current.lastReport).toEqual(mockScanReport);
  });

  it('should handle scan error', async () => {
    (nativeSkill.scanInstalledSkill as jest.Mock).mockRejectedValue(new Error('Scan failed'));

    const { result } = renderHook(() => useSkillSecurity());

    await act(async () => {
      await result.current.scanInstalled('test-skill');
    });

    expect(result.current.lastReport).toBeNull();
    expect(result.current.error).toBe('Scan failed');
    expect(result.current.isScanning).toBe(false);
  });

  it('should return error when native not available', async () => {
    (nativeSkill.isNativeSkillAvailable as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useSkillSecurity());

    await act(async () => {
      await result.current.scanInstalled('test-skill');
    });

    expect(result.current.error).toBe('Native skill service not available');
  });

  it('should clear report', async () => {
    (nativeSkill.scanInstalledSkill as jest.Mock).mockResolvedValue(mockScanReport);

    const { result } = renderHook(() => useSkillSecurity());

    await act(async () => {
      await result.current.scanInstalled('test-skill');
    });

    expect(result.current.lastReport).not.toBeNull();

    act(() => {
      result.current.clearReport();
    });

    expect(result.current.lastReport).toBeNull();
  });

  it('should clear error', async () => {
    (nativeSkill.scanInstalledSkill as jest.Mock).mockRejectedValue(new Error('Scan failed'));

    const { result } = renderHook(() => useSkillSecurity());

    await act(async () => {
      await result.current.scanInstalled('test-skill');
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should load rule count', async () => {
    (nativeSkill.getSecurityRuleCount as jest.Mock).mockResolvedValue(15);

    const { result } = renderHook(() => useSkillSecurity());

    await act(async () => {
      await result.current.loadRuleCount();
    });

    expect(result.current.ruleCount).toBe(15);
  });
});

describe('getSeverityColor', () => {
  it('should return correct colors for each severity', () => {
    expect(getSeverityColor('critical')).toContain('red');
    expect(getSeverityColor('high')).toContain('orange');
    expect(getSeverityColor('medium')).toContain('yellow');
    expect(getSeverityColor('low')).toContain('blue');
    expect(getSeverityColor('info')).toContain('gray');
  });
});

describe('getSeverityLabel', () => {
  it('should return correct labels for each severity', () => {
    expect(getSeverityLabel('critical')).toBe('Critical');
    expect(getSeverityLabel('high')).toBe('High');
    expect(getSeverityLabel('medium')).toBe('Medium');
    expect(getSeverityLabel('low')).toBe('Low');
    expect(getSeverityLabel('info')).toBe('Info');
  });
});

describe('getCategoryLabel', () => {
  it('should return correct labels for each category', () => {
    expect(getCategoryLabel('command_execution')).toBe('Command Execution');
    expect(getCategoryLabel('code_injection')).toBe('Code Injection');
    expect(getCategoryLabel('filesystem_access')).toBe('Filesystem Access');
    expect(getCategoryLabel('network_access')).toBe('Network Access');
    expect(getCategoryLabel('sensitive_data')).toBe('Sensitive Data');
    expect(getCategoryLabel('privilege_escalation')).toBe('Privilege Escalation');
    expect(getCategoryLabel('obfuscated_code')).toBe('Obfuscated Code');
    expect(getCategoryLabel('other')).toBe('Other');
  });

  it('should return the original string for unknown categories', () => {
    expect(getCategoryLabel('unknown_category')).toBe('unknown_category');
  });
});

describe('getRiskScoreColor', () => {
  it('should return red for high risk scores', () => {
    expect(getRiskScoreColor(75)).toContain('red');
    expect(getRiskScoreColor(100)).toContain('red');
  });

  it('should return orange for medium-high risk scores', () => {
    expect(getRiskScoreColor(50)).toContain('orange');
    expect(getRiskScoreColor(74)).toContain('orange');
  });

  it('should return yellow for medium risk scores', () => {
    expect(getRiskScoreColor(25)).toContain('yellow');
    expect(getRiskScoreColor(49)).toContain('yellow');
  });

  it('should return green for low risk scores', () => {
    expect(getRiskScoreColor(0)).toContain('green');
    expect(getRiskScoreColor(24)).toContain('green');
  });
});
