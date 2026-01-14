import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Academic Research - Cognia',
  description: 'Search, analyze, and learn from academic papers',
};

export default function AcademicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
