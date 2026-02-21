/**
 * Legacy tutorial detail route.
 * Preferred route: /speedpass/tutorial?id=<tutorialId>
 */

import TutorialDetailClient from './tutorial-detail-client';

export const dynamicParams = true;

export async function generateStaticParams() {
  // Keep a placeholder for static-export compatibility.
  return [{ id: '_placeholder' }];
}

export default function TutorialDetailPage() {
  return <TutorialDetailClient />;
}

