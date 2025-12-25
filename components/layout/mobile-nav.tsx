'use client';

/**
 * MobileNav - mobile navigation with sheet sidebar
 */

import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useUIStore } from '@/stores';

interface MobileNavProps {
  children?: React.ReactNode;
}

export function MobileNav({ children }: MobileNavProps) {
  const t = useTranslations('accessibility');
  const mobileNavOpen = useUIStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen);

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={t('openMenu')}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        {children}
      </SheetContent>
    </Sheet>
  );
}

export default MobileNav;
