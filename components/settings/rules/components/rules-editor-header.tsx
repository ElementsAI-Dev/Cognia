'use client';

import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RulesEditorHeaderProps {
  isDirty: boolean;
  mobileMenuOpen: boolean;
  onMobileMenuToggle: () => void;
}

export function RulesEditorHeader({
  isDirty,
  mobileMenuOpen,
  onMobileMenuToggle,
}: RulesEditorHeaderProps) {
  const t = useTranslations('rules');

  return (
    <>
      {/* Title Section */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <div className="min-w-0">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <span className="truncate">{t('title')}</span>
            {isDirty && (
              <Badge
                variant="outline"
                className="text-[9px] md:text-[10px] h-4 border-yellow-500 text-yellow-500 font-normal shrink-0"
              >
                {t('unsavedChanges')}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-[10px] md:text-xs truncate hidden sm:block">
            {t('description')}
          </CardDescription>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="icon"
        className="md:hidden h-8 w-8"
        onClick={onMobileMenuToggle}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>
    </>
  );
}
