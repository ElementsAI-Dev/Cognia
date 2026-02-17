'use client';

/**
 * Designer Page - standalone unified DesignerShell entry.
 */

import { useState } from 'react';
import { DesignerShell } from '@/components/designer';

export default function DesignerPage() {
  const [initialCode] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key');
    if (!key) return '';
    const storedCode = sessionStorage.getItem(key) ?? '';
    if (storedCode) {
      sessionStorage.removeItem(key);
    }
    return storedCode;
  });

  return (
    <div className="h-[calc(100vh-var(--titlebar-height,0px))]">
      <DesignerShell standalone initialCode={initialCode} className="h-full" />
    </div>
  );
}
