/**
 * Session Detail Page (Server Component Wrapper)
 * Provides generateStaticParams for static export, delegates to client component.
 */

import SessionDetailClient from './session-detail-client';

export const dynamicParams = false;

export async function generateStaticParams() {
  // Return a placeholder to satisfy static export build validation.
  // Actual sessions are created at runtime via Tauri backend.
  // Client-side navigation via next/link and router.push still works.
  return [{ id: '_placeholder' }];
}

export default function SessionDetailPage() {
  return <SessionDetailClient />;
}
