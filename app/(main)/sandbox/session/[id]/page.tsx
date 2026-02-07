/**
 * Session Detail Page (Server Component Wrapper)
 * Provides generateStaticParams for static export, delegates to client component.
 */

import SessionDetailClient from './session-detail-client';

export const dynamicParams = false;

export async function generateStaticParams() {
  // Sessions are created dynamically at runtime via Tauri backend.
  // With static export (output: "export"), dynamicParams must be false.
  // Client-side navigation via next/link and router.push still works.
  return [];
}

export default function SessionDetailPage() {
  return <SessionDetailClient />;
}
