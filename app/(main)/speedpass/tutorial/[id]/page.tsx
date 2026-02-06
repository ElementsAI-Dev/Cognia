/**
 * Tutorial Detail Page (Server Component Wrapper)
 * Provides generateStaticParams for static export, delegates to client component.
 */

import TutorialDetailClient from './tutorial-detail-client';

export const dynamicParams = false;

export async function generateStaticParams() {
  // Tutorials are created dynamically at runtime via Zustand store.
  // With static export (output: "export"), dynamicParams must be false.
  // Client-side navigation via next/link and router.push still works.
  return [];
}

export default function TutorialDetailPage() {
  return <TutorialDetailClient />;
}


