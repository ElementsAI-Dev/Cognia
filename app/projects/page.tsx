'use client';

/**
 * Projects Page - Manage and organize projects
 */

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ProjectList, ProjectDetail } from '@/components/projects';
import { useProjectStore, useSessionStore } from '@/stores';

export default function ProjectsPage() {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const setActiveProject = useProjectStore((state) => state.setActiveProject);
  const addSessionToProject = useProjectStore((state) => state.addSessionToProject);
  const getProject = useProjectStore((state) => state.getProject);

  const createSession = useSessionStore((state) => state.createSession);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const updateSession = useSessionStore((state) => state.updateSession);

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveProject(projectId);
  };

  const handleBack = () => {
    setSelectedProjectId(null);
  };

  const handleNewChat = (projectId: string) => {
    const project = getProject(projectId);
    if (!project) return;

    // Create a new session with project defaults
    const session = createSession({
      title: 'New Chat',
      provider: project.defaultProvider as 'openai' | 'anthropic' | 'google' | 'deepseek' | 'groq' | 'mistral' | 'ollama' | undefined,
      model: project.defaultModel,
      mode: project.defaultMode,
      systemPrompt: project.customInstructions,
      projectId: projectId,
    });

    // Link session to project
    addSessionToProject(projectId, session.id);

    // Navigate to chat
    router.push('/');
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSession(sessionId);
    router.push('/');
  };

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <header className="flex h-14 items-center gap-4 border-b px-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Projects</h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-6">
          {selectedProjectId ? (
            <ProjectDetail
              projectId={selectedProjectId}
              onBack={handleBack}
              onNewChat={handleNewChat}
              onSelectSession={handleSelectSession}
            />
          ) : (
            <ProjectList onProjectSelect={handleProjectSelect} />
          )}
        </div>
      </div>
    </div>
  );
}
