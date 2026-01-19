'use client';

/**
 * I18n Provider - provides internationalization context
 */

import { NextIntlClientProvider, AbstractIntlMessages } from 'next-intl';
import { useSettingsStore } from '@/stores';
import { useState } from 'react';
import type { Locale } from './config';

// Import messages from split files
import enMessages from './messages/en';
import zhCNMessages from './messages/zh-CN';

const messages: Record<Locale, AbstractIntlMessages> = {
  'en': enMessages,
  'zh-CN': zhCNMessages,
};

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const language = useSettingsStore((state) => state.language);
  const [mounted] = useState(() => typeof window !== 'undefined');

  // Prevent hydration mismatch by rendering with default locale on server
  const locale = mounted ? language : 'en';
  const currentMessages = messages[locale] || messages['en'];

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={currentMessages}
      timeZone="UTC"
    >
      {children}
    </NextIntlClientProvider>
  );
}

export default I18nProvider;
