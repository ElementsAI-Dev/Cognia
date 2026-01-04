import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Git - Cognia',
  description: 'Git version control management',
};

export default function GitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
