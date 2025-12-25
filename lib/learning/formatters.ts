/**
 * Learning Mode Formatters
 * 
 * Utilities for formatting learning session data for display.
 */

import type {
  LearningSession,
  LearningGoal,
  LearningSubQuestion,
  LearningPhase,
} from '@/types/learning';

/**
 * Format learning goals as a markdown list
 */
export function formatLearningGoals(goals: LearningGoal[]): string {
  if (goals.length === 0) {
    return '_No learning goals defined yet_';
  }

  return goals
    .map((goal, index) => {
      const status = goal.achieved ? '✅' : '⬜';
      return `${index + 1}. ${status} ${goal.description}`;
    })
    .join('\n');
}

/**
 * Format sub-questions list with status indicators
 */
export function formatSubQuestionsList(subQuestions: LearningSubQuestion[]): string {
  if (subQuestions.length === 0) {
    return '_No sub-questions identified yet_';
  }

  const statusIcons: Record<LearningSubQuestion['status'], string> = {
    pending: '⏳',
    in_progress: '🔄',
    resolved: '✅',
    skipped: '⏭️',
  };

  return subQuestions
    .map((sq, index) => {
      const icon = statusIcons[sq.status];
      let line = `${index + 1}. ${icon} ${sq.question}`;
      
      if (sq.status === 'in_progress' && sq.userAttempts > 0) {
        line += ` _(${sq.userAttempts} attempts)_`;
      }
      
      if (sq.hints.length > 0) {
        line += ` 💡×${sq.hints.length}`;
      }

      return line;
    })
    .join('\n');
}

/**
 * Format a progress report for the learning session
 */
export function formatProgressReport(session: LearningSession): string {
  const { topic, currentPhase, progress, subQuestions, learningGoals } = session;

  const phaseEmoji: Record<LearningPhase, string> = {
    clarification: '🎯',
    deconstruction: '🧩',
    questioning: '❓',
    feedback: '💬',
    summary: '📝',
  };

  const phaseLabels: Record<LearningPhase, string> = {
    clarification: 'Clarification',
    deconstruction: 'Deconstruction',
    questioning: 'Questioning',
    feedback: 'Feedback',
    summary: 'Summary',
  };

  const resolvedCount = subQuestions.filter((sq) => sq.status === 'resolved').length;
  const achievedCount = learningGoals.filter((g) => g.achieved).length;

  let report = `# Learning Session Progress\n\n`;
  report += `**Topic**: ${topic}\n\n`;
  report += `## Current Phase\n`;
  report += `${phaseEmoji[currentPhase]} **${phaseLabels[currentPhase]}**\n\n`;
  
  report += `## Progress Overview\n`;
  report += `${'█'.repeat(Math.floor(progress / 10))}${'░'.repeat(10 - Math.floor(progress / 10))} ${progress}%\n\n`;

  if (subQuestions.length > 0) {
    report += `## Sub-Questions (${resolvedCount}/${subQuestions.length})\n`;
    report += formatSubQuestionsList(subQuestions);
    report += '\n\n';
  }

  if (learningGoals.length > 0) {
    report += `## Learning Goals (${achievedCount}/${learningGoals.length})\n`;
    report += formatLearningGoals(learningGoals);
    report += '\n';
  }

  return report;
}

/**
 * Format the final session summary
 */
export function formatSessionSummary(session: LearningSession): string {
  const {
    topic,
    learningGoals,
    subQuestions,
    totalHintsProvided,
    startedAt,
    completedAt,
    finalSummary,
    keyTakeaways,
  } = session;

  const achievedGoals = learningGoals.filter((g) => g.achieved);
  const resolvedQuestions = subQuestions.filter((sq) => sq.status === 'resolved');
  
  // Calculate duration
  const endTime = completedAt || new Date();
  const durationMs = endTime.getTime() - startedAt.getTime();
  const durationMinutes = Math.round(durationMs / 60000);

  let summary = `# 🎓 Learning Session Complete!\n\n`;
  summary += `**Topic**: ${topic}\n`;
  summary += `**Duration**: ${durationMinutes} minutes\n\n`;

  summary += `## Achievements\n`;
  summary += `- ✅ ${achievedGoals.length}/${learningGoals.length} learning goals achieved\n`;
  summary += `- 💡 ${resolvedQuestions.length} concepts explored\n`;
  summary += `- 🎯 ${totalHintsProvided} hints used\n\n`;

  if (keyTakeaways && keyTakeaways.length > 0) {
    summary += `## Key Takeaways\n`;
    keyTakeaways.forEach((takeaway, index) => {
      summary += `${index + 1}. ${takeaway}\n`;
    });
    summary += '\n';
  }

  if (finalSummary) {
    summary += `## Summary\n`;
    summary += `${finalSummary}\n\n`;
  }

  // List resolved sub-questions with insights
  const questionsWithInsights = resolvedQuestions.filter(
    (sq) => sq.keyInsights && sq.keyInsights.length > 0
  );
  if (questionsWithInsights.length > 0) {
    summary += `## Insights Discovered\n`;
    questionsWithInsights.forEach((sq) => {
      summary += `### ${sq.question}\n`;
      sq.keyInsights?.forEach((insight) => {
        summary += `- ${insight}\n`;
      });
      summary += '\n';
    });
  }

  summary += `---\n`;
  summary += `_Great job on completing this learning session! Remember: the best way to solidify your knowledge is to teach it to someone else._`;

  return summary;
}

/**
 * Format a compact status line for the learning session
 */
export function formatStatusLine(session: LearningSession): string {
  const { currentPhase, progress, subQuestions } = session;
  
  const phaseShort: Record<LearningPhase, string> = {
    clarification: 'Clarifying',
    deconstruction: 'Breaking Down',
    questioning: 'Exploring',
    feedback: 'Refining',
    summary: 'Summarizing',
  };

  const resolvedCount = subQuestions.filter((sq) => sq.status === 'resolved').length;
  const sqStatus = subQuestions.length > 0 
    ? `${resolvedCount}/${subQuestions.length} questions` 
    : '';

  return `${phaseShort[currentPhase]} • ${progress}% ${sqStatus}`.trim();
}
