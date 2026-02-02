/**
 * Leaderboard Command
 *
 * @description CLI command to view LMArena chatbot arena leaderboard.
 */

import type { LeaderboardCategory } from '../../types';

interface LeaderboardOptions {
  category: LeaderboardCategory;
  limit: string;
  json: boolean;
}

interface LeaderboardEntry {
  rank: number;
  model: string;
  score: number;
  organization: string;
  votes: number;
}

const LMARENA_API_URL = 'https://lmarena.ai/api/v1/leaderboard';

export async function leaderboardCommand(options: LeaderboardOptions): Promise<void> {
  if (!options.json) {
    console.log('\n🏆 AI Tools - LMArena Leaderboard\n');
    console.log(`📂 Category: ${options.category}`);
    console.log(`📊 Limit: ${options.limit} entries\n`);
  }

  try {
    const limit = parseInt(options.limit, 10);

    // Try to fetch from API
    console.log('⏳ Fetching leaderboard...\n');

    const data = await fetchLeaderboard(options.category, limit);

    if (options.json) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        category: options.category,
        entries: data,
      }, null, 2));
    } else {
      printLeaderboard(data, options.category);
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ error: String(error) }));
    } else {
      console.error('❌ Error fetching leaderboard:', error);
    }
    process.exit(1);
  }
}

async function fetchLeaderboard(
  category: LeaderboardCategory,
  limit: number
): Promise<LeaderboardEntry[]> {
  try {
    // Try to fetch from the API
    const response = await fetch(`${LMARENA_API_URL}?category=${category}&limit=${limit}`, {
      headers: { 'User-Agent': 'AI-Tools-CLI/1.0' },
    });

    if (response.ok) {
      const data = await response.json();
      return data.entries || data;
    }
  } catch {
    // API not available, use sample data
  }

  // Return sample data for demonstration
  console.log('⚠️  Using sample data (API not available)\n');

  return [
    { rank: 1, model: 'Gemini-2.0-Pro', score: 1350, organization: 'Google', votes: 125000 },
    { rank: 2, model: 'Claude-3.5-Sonnet', score: 1340, organization: 'Anthropic', votes: 118000 },
    { rank: 3, model: 'GPT-4o', score: 1325, organization: 'OpenAI', votes: 142000 },
    { rank: 4, model: 'DeepSeek-V3', score: 1310, organization: 'DeepSeek', votes: 45000 },
    { rank: 5, model: 'Llama-3.3-70B', score: 1295, organization: 'Meta', votes: 38000 },
    { rank: 6, model: 'Qwen-2.5-Max', score: 1280, organization: 'Alibaba', votes: 28000 },
    { rank: 7, model: 'Mistral-Large-2', score: 1265, organization: 'Mistral', votes: 22000 },
    { rank: 8, model: 'Yi-Lightning', score: 1250, organization: '01.AI', votes: 15000 },
    { rank: 9, model: 'Claude-3-Opus', score: 1245, organization: 'Anthropic', votes: 85000 },
    { rank: 10, model: 'Gemini-1.5-Pro', score: 1235, organization: 'Google', votes: 72000 },
  ].slice(0, limit);
}

function printLeaderboard(entries: LeaderboardEntry[], category: string): void {
  console.log(`🏆 ${category.toUpperCase()} Leaderboard\n`);
  console.log('┌──────┬───────────────────────┬───────┬──────────────┬─────────┐');
  console.log('│ Rank │ Model                 │ Score │ Organization │ Votes   │');
  console.log('├──────┼───────────────────────┼───────┼──────────────┼─────────┤');

  for (const entry of entries) {
    const rank = String(entry.rank).padStart(4);
    const model = entry.model.padEnd(21).slice(0, 21);
    const score = String(entry.score).padStart(5);
    const org = entry.organization.padEnd(12).slice(0, 12);
    const votes = formatVotes(entry.votes).padStart(7);

    console.log(`│ ${rank} │ ${model} │ ${score} │ ${org} │ ${votes} │`);
  }

  console.log('└──────┴───────────────────────┴───────┴──────────────┴─────────┘');
  console.log(`\nTotal entries: ${entries.length}\n`);
}

function formatVotes(votes: number): string {
  if (votes >= 1000000) {
    return `${(votes / 1000000).toFixed(1)}M`;
  }
  if (votes >= 1000) {
    return `${(votes / 1000).toFixed(1)}K`;
  }
  return String(votes);
}
