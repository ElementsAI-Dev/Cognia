'use client';

/**
 * SkillSecurityScanner - Component for displaying skill security scan results
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  FileCode,
  Clock,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  useSkillSecurity,
  getSeverityColor,
  getSeverityLabel,
  getCategoryLabel,
  getRiskScoreColor,
} from '@/hooks/skills/use-skill-security';
import type { SecurityScanReport, SecurityFinding } from '@/lib/native/skill';

interface SkillSecurityScannerProps {
  skillDirectory?: string;
  skillPath?: string;
  skillName?: string;
  autoScan?: boolean;
  onScanComplete?: (report: SecurityScanReport) => void;
  className?: string;
}

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case 'critical':
      return <ShieldAlert className="h-4 w-4 text-red-600" />;
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'medium':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'low':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'info':
      return <Info className="h-4 w-4 text-gray-500" />;
    default:
      return <Info className="h-4 w-4" />;
  }
}

function FindingCard({ finding }: { finding: SecurityFinding }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-2">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3 px-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SeverityIcon severity={finding.severity} />
                <span className="font-medium text-sm">{finding.title}</span>
                <Badge variant="outline" className="text-xs">
                  {finding.ruleId}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn('text-xs', getSeverityColor(finding.severity))}>
                  {getSeverityLabel(finding.severity)}
                </Badge>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">{finding.description}</p>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileCode className="h-3 w-3" />
                <span className="font-mono">
                  {finding.filePath}:{finding.line}:{finding.column}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {getCategoryLabel(finding.category)}
                </Badge>
              </div>

              {finding.snippet && (
                <div className="bg-muted rounded-md p-3 font-mono text-xs overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{finding.snippet}</pre>
                </div>
              )}

              {finding.suggestion && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Suggestion:</strong> {finding.suggestion}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ScanSummary({ report }: { report: SecurityScanReport }) {
  const t = useTranslations('skills');
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {report.summary.isSafe ? (
            <ShieldCheck className="h-6 w-6 text-green-600" />
          ) : (
            <ShieldAlert className="h-6 w-6 text-red-600" />
          )}
          <span className="font-semibold">
            {report.summary.isSafe ? t('securitySafe') : t('securityIssuesFound')}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{report.durationMs}ms</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold">{report.summary.filesScanned}</div>
          <div className="text-xs text-muted-foreground">{t('filesScanned')}</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold">{report.summary.totalFindings}</div>
          <div className="text-xs text-muted-foreground">{t('totalFindings')}</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className={cn('text-2xl font-bold', getRiskScoreColor(report.summary.riskScore))}>
            {report.summary.riskScore}
          </div>
          <div className="text-xs text-muted-foreground">{t('riskScore')}</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <Progress 
            value={100 - report.summary.riskScore} 
            className="h-2 mt-2"
          />
          <div className="text-xs text-muted-foreground mt-1">{t('safetyLevel')}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {report.summary.critical > 0 && (
          <Badge className="bg-red-600 text-white">
            {report.summary.critical} Critical
          </Badge>
        )}
        {report.summary.high > 0 && (
          <Badge className="bg-orange-500 text-white">
            {report.summary.high} High
          </Badge>
        )}
        {report.summary.medium > 0 && (
          <Badge className="bg-yellow-500 text-black">
            {report.summary.medium} Medium
          </Badge>
        )}
        {report.summary.low > 0 && (
          <Badge className="bg-blue-500 text-white">
            {report.summary.low} Low
          </Badge>
        )}
        {report.summary.info > 0 && (
          <Badge className="bg-gray-500 text-white">
            {report.summary.info} Info
          </Badge>
        )}
      </div>
    </div>
  );
}

export function SkillSecurityScanner({
  skillDirectory,
  skillPath,
  skillName,
  autoScan = false,
  onScanComplete,
  className,
}: SkillSecurityScannerProps) {
  const t = useTranslations('skills');
  const {
    isScanning,
    lastReport,
    error,
    scanInstalled,
    scanPath,
    clearError,
  } = useSkillSecurity();

  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = async () => {
    let report: SecurityScanReport | null = null;
    
    if (skillDirectory) {
      report = await scanInstalled(skillDirectory);
    } else if (skillPath) {
      report = await scanPath(skillPath);
    }

    if (report) {
      setHasScanned(true);
      onScanComplete?.(report);
    }
  };

  useEffect(() => {
    if (autoScan && !hasScanned && (skillDirectory || skillPath)) {
      const runScan = async () => {
        let report: SecurityScanReport | null = null;
        if (skillDirectory) {
          report = await scanInstalled(skillDirectory);
        } else if (skillPath) {
          report = await scanPath(skillPath);
        }
        if (report) {
          setHasScanned(true);
          onScanComplete?.(report);
        }
      };
      runScan();
    }
  }, [autoScan, hasScanned, skillDirectory, skillPath, scanInstalled, scanPath, onScanComplete]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h3 className="font-semibold">{t('securityScan')}</h3>
          {skillName && (
            <span className="text-sm text-muted-foreground">- {skillName}</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleScan}
          disabled={isScanning || (!skillDirectory && !skillPath)}
        >
          {isScanning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('scanning')}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              {hasScanned ? t('rescan') : t('startScan')}
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {lastReport && (
        <div className="space-y-4">
          <ScanSummary report={lastReport} />
          
          {lastReport.findings.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">{t('findings')}</h4>
              <ScrollArea className="h-[400px]">
                {lastReport.findings.map((finding, index) => (
                  <FindingCard key={`${finding.ruleId}-${index}`} finding={finding} />
                ))}
              </ScrollArea>
            </div>
          )}

          {lastReport.findings.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-2 text-green-600" />
              <p>{t('noSecurityIssues')}</p>
            </div>
          )}
        </div>
      )}

      {!lastReport && !isScanning && !error && (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>{t('clickToScan')}</p>
        </div>
      )}
    </div>
  );
}

export default SkillSecurityScanner;
