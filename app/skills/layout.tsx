import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Skills - Cognia',
  description: 'Manage your AI skills library',
};

export default function SkillsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
