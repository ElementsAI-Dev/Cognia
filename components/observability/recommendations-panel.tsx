'use client';

/**
 * Recommendations Panel
 *
 * Displays AI usage recommendations based on patterns.
 */

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface RecommendationsPanelProps {
  recommendations: string[];
  className?: string;
}

export function RecommendationsPanel({ recommendations, className }: RecommendationsPanelProps) {
  const t = useTranslations('observability.recommendations');

  const getIcon = (recommendation: string) => {
    if (recommendation.includes('healthy') || recommendation.includes('good')) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (recommendation.includes('savings') || recommendation.includes('cost')) {
      return <TrendingUp className="h-4 w-4 text-blue-600" />;
    }
    if (recommendation.includes('increased') || recommendation.includes('high')) {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
    return <Lightbulb className="h-4 w-4 text-primary" />;
  };

  const getVariant = (recommendation: string): 'default' | 'destructive' => {
    if (recommendation.includes('healthy') || recommendation.includes('good')) {
      return 'default';
    }
    return 'default';
  };

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recommendations.map((recommendation, index) => (
          <Alert key={index} variant={getVariant(recommendation)} className="py-2">
            <div className="flex items-start gap-2">
              {getIcon(recommendation)}
              <AlertDescription className="text-sm">{recommendation}</AlertDescription>
            </div>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}
