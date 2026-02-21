/**
 * Tutorial Detail Query Route
 *
 * Canonical static-export-safe entry:
 * /speedpass/tutorial?id=<tutorialId>
 */

import TutorialDetailClient from './[id]/tutorial-detail-client';

export default function TutorialDetailQueryPage() {
  return <TutorialDetailClient />;
}

