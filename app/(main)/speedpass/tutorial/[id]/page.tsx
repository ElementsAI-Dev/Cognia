/**
 * Tutorial Detail Page (Server Component Wrapper)
 * Provides generateStaticParams for static export, delegates to client component.
 */

import TutorialDetailClient from './tutorial-detail-client';

export const dynamicParams = false;

export async function generateStaticParams() {
  // Return a placeholder to satisfy static export build validation.
  // Actual tutorials are created at runtime via Zustand store.
  // Client-side navigation via next/link and router.push still works.
  return [{ id: '_placeholder' }];
}

export default function TutorialDetailPage() {
  return <TutorialDetailClient />;
}


