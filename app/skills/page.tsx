'use client';

/**
 * Skills Page
 * 
 * Main page for managing AI skills
 */

import { SkillPanel } from '@/components/skills';

export default function SkillsPage() {
  return (
    <div className="h-screen">
      <SkillPanel className="h-full" />
    </div>
  );
}
