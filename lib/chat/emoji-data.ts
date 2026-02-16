/**
 * Emoji Data
 *
 * Common emojis organized by category for the emoji picker.
 * Optimized for quick search and display.
 */

import type { EmojiData, EmojiCategory } from '@/types/chat/input-completion';

/** Emoji database */
export const EMOJI_DATA: EmojiData[] = [
  // Smileys & Emotion
  { emoji: '😀', name: 'grinning', keywords: ['smile', 'happy', 'joy'], category: 'smileys' },
  { emoji: '😃', name: 'smiley', keywords: ['smile', 'happy'], category: 'smileys' },
  { emoji: '😄', name: 'smile', keywords: ['happy', 'joy', 'laugh'], category: 'smileys' },
  { emoji: '😁', name: 'grin', keywords: ['smile', 'happy'], category: 'smileys' },
  { emoji: '😅', name: 'sweat_smile', keywords: ['hot', 'relief'], category: 'smileys' },
  { emoji: '😂', name: 'joy', keywords: ['laugh', 'tears', 'funny', 'lol'], category: 'smileys' },
  { emoji: '🤣', name: 'rofl', keywords: ['laugh', 'funny', 'lol'], category: 'smileys' },
  { emoji: '😊', name: 'blush', keywords: ['smile', 'happy', 'shy'], category: 'smileys' },
  { emoji: '😇', name: 'innocent', keywords: ['angel', 'halo'], category: 'smileys' },
  { emoji: '🙂', name: 'slightly_smiling', keywords: ['smile'], category: 'smileys' },
  { emoji: '😉', name: 'wink', keywords: ['flirt'], category: 'smileys' },
  { emoji: '😍', name: 'heart_eyes', keywords: ['love', 'crush'], category: 'smileys' },
  { emoji: '🥰', name: 'smiling_hearts', keywords: ['love', 'adore'], category: 'smileys' },
  { emoji: '😘', name: 'kissing_heart', keywords: ['love', 'kiss'], category: 'smileys' },
  { emoji: '😋', name: 'yum', keywords: ['delicious', 'tongue'], category: 'smileys' },
  { emoji: '😎', name: 'sunglasses', keywords: ['cool', 'summer'], category: 'smileys' },
  { emoji: '🤔', name: 'thinking', keywords: ['hmm', 'consider'], category: 'smileys' },
  { emoji: '🤨', name: 'raised_eyebrow', keywords: ['skeptic', 'doubt'], category: 'smileys' },
  { emoji: '😐', name: 'neutral', keywords: ['meh', 'blank'], category: 'smileys' },
  { emoji: '😑', name: 'expressionless', keywords: ['blank', 'meh'], category: 'smileys' },
  { emoji: '😶', name: 'no_mouth', keywords: ['silent', 'mute'], category: 'smileys' },
  { emoji: '🙄', name: 'rolling_eyes', keywords: ['annoyed'], category: 'smileys' },
  { emoji: '😏', name: 'smirk', keywords: ['flirt', 'sly'], category: 'smileys' },
  { emoji: '😣', name: 'persevere', keywords: ['struggle'], category: 'smileys' },
  { emoji: '😥', name: 'sad', keywords: ['disappointed'], category: 'smileys' },
  { emoji: '😮', name: 'open_mouth', keywords: ['surprised', 'wow'], category: 'smileys' },
  { emoji: '😯', name: 'hushed', keywords: ['surprised'], category: 'smileys' },
  { emoji: '😲', name: 'astonished', keywords: ['shocked', 'wow'], category: 'smileys' },
  { emoji: '😱', name: 'scream', keywords: ['scared', 'horror'], category: 'smileys' },
  { emoji: '😭', name: 'sob', keywords: ['cry', 'sad', 'tears'], category: 'smileys' },
  { emoji: '😤', name: 'triumph', keywords: ['angry', 'proud'], category: 'smileys' },
  { emoji: '😡', name: 'rage', keywords: ['angry', 'mad'], category: 'smileys' },
  { emoji: '🤬', name: 'cursing', keywords: ['angry', 'swear'], category: 'smileys' },
  { emoji: '😈', name: 'smiling_imp', keywords: ['devil', 'evil'], category: 'smileys' },
  { emoji: '💀', name: 'skull', keywords: ['dead', 'death'], category: 'smileys' },
  { emoji: '🤖', name: 'robot', keywords: ['bot', 'ai'], category: 'smileys' },
  { emoji: '👻', name: 'ghost', keywords: ['halloween', 'spooky'], category: 'smileys' },
  { emoji: '💩', name: 'poop', keywords: ['shit', 'crap'], category: 'smileys' },
  { emoji: '🤡', name: 'clown', keywords: ['circus', 'funny'], category: 'smileys' },

  // People & Body
  { emoji: '👍', name: 'thumbsup', keywords: ['yes', 'ok', 'good', 'like'], category: 'people' },
  { emoji: '👎', name: 'thumbsdown', keywords: ['no', 'bad', 'dislike'], category: 'people' },
  { emoji: '👏', name: 'clap', keywords: ['applause', 'bravo'], category: 'people' },
  { emoji: '🙌', name: 'raised_hands', keywords: ['hooray', 'celebrate'], category: 'people' },
  { emoji: '🤝', name: 'handshake', keywords: ['deal', 'agree'], category: 'people' },
  { emoji: '🙏', name: 'pray', keywords: ['please', 'thanks', 'hope'], category: 'people' },
  { emoji: '✌️', name: 'v', keywords: ['peace', 'victory'], category: 'people' },
  { emoji: '👋', name: 'wave', keywords: ['hello', 'bye', 'hi'], category: 'people' },
  { emoji: '💪', name: 'muscle', keywords: ['strong', 'flex'], category: 'people' },
  { emoji: '👀', name: 'eyes', keywords: ['look', 'see', 'watch'], category: 'people' },
  { emoji: '🧠', name: 'brain', keywords: ['smart', 'think', 'mind'], category: 'people' },
  { emoji: '❤️', name: 'heart', keywords: ['love', 'like'], category: 'people' },
  { emoji: '💔', name: 'broken_heart', keywords: ['sad', 'heartbreak'], category: 'people' },
  { emoji: '💯', name: '100', keywords: ['perfect', 'score'], category: 'people' },
  { emoji: '🔥', name: 'fire', keywords: ['hot', 'lit', 'awesome'], category: 'people' },
  { emoji: '✨', name: 'sparkles', keywords: ['magic', 'new', 'clean'], category: 'people' },
  { emoji: '⭐', name: 'star', keywords: ['favorite', 'best'], category: 'people' },
  { emoji: '🌟', name: 'star2', keywords: ['glow', 'shine'], category: 'people' },
  { emoji: '💫', name: 'dizzy', keywords: ['star', 'magic'], category: 'people' },
  { emoji: '💥', name: 'boom', keywords: ['explosion', 'collision'], category: 'people' },

  // Animals & Nature
  { emoji: '🐶', name: 'dog', keywords: ['puppy', 'pet'], category: 'animals' },
  { emoji: '🐱', name: 'cat', keywords: ['kitten', 'pet'], category: 'animals' },
  { emoji: '🐭', name: 'mouse', keywords: ['mice'], category: 'animals' },
  { emoji: '🐰', name: 'rabbit', keywords: ['bunny', 'easter'], category: 'animals' },
  { emoji: '🦊', name: 'fox', keywords: ['animal'], category: 'animals' },
  { emoji: '🐻', name: 'bear', keywords: ['teddy'], category: 'animals' },
  { emoji: '🐼', name: 'panda', keywords: ['animal', 'cute'], category: 'animals' },
  { emoji: '🐨', name: 'koala', keywords: ['animal'], category: 'animals' },
  { emoji: '🦁', name: 'lion', keywords: ['king', 'animal'], category: 'animals' },
  { emoji: '🐮', name: 'cow', keywords: ['moo', 'animal'], category: 'animals' },
  { emoji: '🐷', name: 'pig', keywords: ['oink', 'animal'], category: 'animals' },
  { emoji: '🐸', name: 'frog', keywords: ['toad'], category: 'animals' },
  { emoji: '🐵', name: 'monkey', keywords: ['ape', 'animal'], category: 'animals' },
  { emoji: '🦄', name: 'unicorn', keywords: ['magic', 'fantasy'], category: 'animals' },
  { emoji: '🐝', name: 'bee', keywords: ['honey', 'insect'], category: 'animals' },
  { emoji: '🦋', name: 'butterfly', keywords: ['insect', 'beautiful'], category: 'animals' },
  { emoji: '🐢', name: 'turtle', keywords: ['slow', 'animal'], category: 'animals' },
  { emoji: '🐍', name: 'snake', keywords: ['reptile'], category: 'animals' },
  { emoji: '🦈', name: 'shark', keywords: ['fish', 'ocean'], category: 'animals' },
  { emoji: '🐳', name: 'whale', keywords: ['ocean', 'sea'], category: 'animals' },

  // Food & Drink
  { emoji: '🍕', name: 'pizza', keywords: ['food', 'slice'], category: 'food' },
  { emoji: '🍔', name: 'burger', keywords: ['food', 'hamburger'], category: 'food' },
  { emoji: '🍟', name: 'fries', keywords: ['food', 'mcdonald'], category: 'food' },
  { emoji: '🌮', name: 'taco', keywords: ['food', 'mexican'], category: 'food' },
  { emoji: '🍣', name: 'sushi', keywords: ['food', 'japanese'], category: 'food' },
  { emoji: '🍜', name: 'ramen', keywords: ['food', 'noodles'], category: 'food' },
  { emoji: '🍰', name: 'cake', keywords: ['dessert', 'birthday'], category: 'food' },
  { emoji: '🍩', name: 'donut', keywords: ['dessert', 'sweet'], category: 'food' },
  { emoji: '🍪', name: 'cookie', keywords: ['dessert', 'sweet'], category: 'food' },
  { emoji: '🍫', name: 'chocolate', keywords: ['candy', 'sweet'], category: 'food' },
  { emoji: '☕', name: 'coffee', keywords: ['drink', 'cafe', 'morning'], category: 'food' },
  { emoji: '🍵', name: 'tea', keywords: ['drink', 'green'], category: 'food' },
  { emoji: '🍺', name: 'beer', keywords: ['drink', 'alcohol'], category: 'food' },
  { emoji: '🍷', name: 'wine', keywords: ['drink', 'alcohol'], category: 'food' },
  { emoji: '🥤', name: 'cup_straw', keywords: ['drink', 'soda'], category: 'food' },
  { emoji: '🍎', name: 'apple', keywords: ['fruit', 'red'], category: 'food' },
  { emoji: '🍊', name: 'orange', keywords: ['fruit'], category: 'food' },
  { emoji: '🍋', name: 'lemon', keywords: ['fruit', 'yellow'], category: 'food' },
  { emoji: '🍇', name: 'grapes', keywords: ['fruit', 'wine'], category: 'food' },
  { emoji: '🍓', name: 'strawberry', keywords: ['fruit', 'berry'], category: 'food' },

  // Activities
  { emoji: '⚽', name: 'soccer', keywords: ['sport', 'football'], category: 'activities' },
  { emoji: '🏀', name: 'basketball', keywords: ['sport', 'ball'], category: 'activities' },
  { emoji: '🏈', name: 'football', keywords: ['sport', 'american'], category: 'activities' },
  { emoji: '⚾', name: 'baseball', keywords: ['sport', 'ball'], category: 'activities' },
  { emoji: '🎾', name: 'tennis', keywords: ['sport', 'ball'], category: 'activities' },
  { emoji: '🎮', name: 'video_game', keywords: ['gaming', 'controller'], category: 'activities' },
  { emoji: '🎯', name: 'dart', keywords: ['target', 'bullseye'], category: 'activities' },
  { emoji: '🎲', name: 'game_die', keywords: ['dice', 'random'], category: 'activities' },
  { emoji: '🎸', name: 'guitar', keywords: ['music', 'rock'], category: 'activities' },
  { emoji: '🎹', name: 'piano', keywords: ['music', 'keyboard'], category: 'activities' },
  { emoji: '🎤', name: 'microphone', keywords: ['sing', 'karaoke'], category: 'activities' },
  { emoji: '🎬', name: 'clapper', keywords: ['movie', 'film'], category: 'activities' },
  { emoji: '🎨', name: 'art', keywords: ['paint', 'palette'], category: 'activities' },
  { emoji: '🎭', name: 'masks', keywords: ['theater', 'drama'], category: 'activities' },
  { emoji: '🏆', name: 'trophy', keywords: ['win', 'award', 'champion'], category: 'activities' },
  { emoji: '🥇', name: 'first_place', keywords: ['gold', 'medal', 'winner'], category: 'activities' },
  { emoji: '🎁', name: 'gift', keywords: ['present', 'birthday'], category: 'activities' },
  { emoji: '🎉', name: 'tada', keywords: ['party', 'celebrate'], category: 'activities' },
  { emoji: '🎊', name: 'confetti', keywords: ['party', 'celebrate'], category: 'activities' },
  { emoji: '🎈', name: 'balloon', keywords: ['party', 'birthday'], category: 'activities' },

  // Travel & Places
  { emoji: '🚗', name: 'car', keywords: ['drive', 'vehicle'], category: 'travel' },
  { emoji: '✈️', name: 'airplane', keywords: ['fly', 'travel'], category: 'travel' },
  { emoji: '🚀', name: 'rocket', keywords: ['space', 'launch', 'fast'], category: 'travel' },
  { emoji: '🏠', name: 'house', keywords: ['home', 'building'], category: 'travel' },
  { emoji: '🏢', name: 'office', keywords: ['building', 'work'], category: 'travel' },
  { emoji: '🏝️', name: 'island', keywords: ['beach', 'vacation'], category: 'travel' },
  { emoji: '🌍', name: 'earth', keywords: ['globe', 'world'], category: 'travel' },
  { emoji: '🌈', name: 'rainbow', keywords: ['weather', 'colors'], category: 'travel' },
  { emoji: '☀️', name: 'sun', keywords: ['weather', 'sunny', 'hot'], category: 'travel' },
  { emoji: '🌙', name: 'moon', keywords: ['night', 'sleep'], category: 'travel' },
  { emoji: '⛈️', name: 'thunder_cloud', keywords: ['weather', 'storm'], category: 'travel' },
  { emoji: '❄️', name: 'snowflake', keywords: ['cold', 'winter'], category: 'travel' },
  { emoji: '🌊', name: 'ocean_wave', keywords: ['ocean', 'sea', 'water'], category: 'travel' },
  { emoji: '⛰️', name: 'mountain', keywords: ['nature', 'hike'], category: 'travel' },
  { emoji: '🏕️', name: 'camping', keywords: ['tent', 'outdoor'], category: 'travel' },

  // Objects
  { emoji: '💻', name: 'laptop', keywords: ['computer', 'work', 'code'], category: 'objects' },
  { emoji: '📱', name: 'phone', keywords: ['mobile', 'call'], category: 'objects' },
  { emoji: '⌨️', name: 'keyboard', keywords: ['type', 'computer'], category: 'objects' },
  { emoji: '🖥️', name: 'desktop', keywords: ['computer', 'monitor'], category: 'objects' },
  { emoji: '📷', name: 'camera', keywords: ['photo', 'picture'], category: 'objects' },
  { emoji: '📚', name: 'books', keywords: ['read', 'study', 'library'], category: 'objects' },
  { emoji: '📝', name: 'memo', keywords: ['note', 'write'], category: 'objects' },
  { emoji: '✏️', name: 'pencil', keywords: ['write', 'draw'], category: 'objects' },
  { emoji: '📎', name: 'paperclip', keywords: ['attach', 'office'], category: 'objects' },
  { emoji: '🔧', name: 'wrench', keywords: ['tool', 'fix'], category: 'objects' },
  { emoji: '🔨', name: 'hammer', keywords: ['tool', 'build'], category: 'objects' },
  { emoji: '💡', name: 'bulb', keywords: ['idea', 'light'], category: 'objects' },
  { emoji: '🔑', name: 'key', keywords: ['lock', 'password'], category: 'objects' },
  { emoji: '🔒', name: 'lock', keywords: ['secure', 'password'], category: 'objects' },
  { emoji: '💎', name: 'gem', keywords: ['diamond', 'jewel'], category: 'objects' },
  { emoji: '⏰', name: 'alarm_clock', keywords: ['time', 'wake'], category: 'objects' },
  { emoji: '📧', name: 'email', keywords: ['mail', 'message'], category: 'objects' },
  { emoji: '📦', name: 'package', keywords: ['box', 'delivery'], category: 'objects' },
  { emoji: '🎵', name: 'music', keywords: ['note', 'song'], category: 'objects' },
  { emoji: '🔔', name: 'bell', keywords: ['notification', 'alert'], category: 'objects' },

  // Symbols
  { emoji: '✅', name: 'check', keywords: ['yes', 'done', 'complete'], category: 'symbols' },
  { emoji: '❌', name: 'x', keywords: ['no', 'wrong', 'delete'], category: 'symbols' },
  { emoji: '❓', name: 'question', keywords: ['help', 'what'], category: 'symbols' },
  { emoji: '❗', name: 'exclamation', keywords: ['important', 'alert'], category: 'symbols' },
  { emoji: '⚠️', name: 'warning', keywords: ['caution', 'alert'], category: 'symbols' },
  { emoji: '🚫', name: 'no_entry', keywords: ['forbidden', 'stop'], category: 'symbols' },
  { emoji: '♻️', name: 'recycle', keywords: ['green', 'environment'], category: 'symbols' },
  { emoji: '➡️', name: 'arrow_right', keywords: ['next', 'forward'], category: 'symbols' },
  { emoji: '⬅️', name: 'arrow_left', keywords: ['back', 'previous'], category: 'symbols' },
  { emoji: '⬆️', name: 'arrow_up', keywords: ['up', 'increase'], category: 'symbols' },
  { emoji: '⬇️', name: 'arrow_down', keywords: ['down', 'decrease'], category: 'symbols' },
  { emoji: '🔄', name: 'arrows_clockwise', keywords: ['refresh', 'sync'], category: 'symbols' },
  { emoji: '➕', name: 'plus', keywords: ['add', 'new'], category: 'symbols' },
  { emoji: '➖', name: 'minus', keywords: ['remove', 'subtract'], category: 'symbols' },
  { emoji: '💲', name: 'dollar', keywords: ['money', 'price'], category: 'symbols' },
  { emoji: '©️', name: 'copyright', keywords: ['legal'], category: 'symbols' },
  { emoji: '®️', name: 'registered', keywords: ['legal', 'trademark'], category: 'symbols' },
  { emoji: '™️', name: 'tm', keywords: ['trademark', 'legal'], category: 'symbols' },
  { emoji: 'ℹ️', name: 'info', keywords: ['information', 'help'], category: 'symbols' },
  { emoji: '🔗', name: 'link', keywords: ['url', 'chain'], category: 'symbols' },

  // Flags (common ones)
  { emoji: '🏳️', name: 'white_flag', keywords: ['surrender', 'peace'], category: 'flags' },
  { emoji: '🏴', name: 'black_flag', keywords: ['pirate'], category: 'flags' },
  { emoji: '🚩', name: 'red_flag', keywords: ['warning', 'danger'], category: 'flags' },
  { emoji: '🏁', name: 'checkered_flag', keywords: ['finish', 'race'], category: 'flags' },
];

/** Get emoji by name */
export function getEmojiByName(name: string): EmojiData | undefined {
  return EMOJI_DATA.find((e) => e.name === name.toLowerCase());
}

/** Search emojis by query */
export function searchEmojis(query: string, limit = 20): EmojiData[] {
  if (!query) return EMOJI_DATA.slice(0, limit);

  const normalizedQuery = query.toLowerCase();
  const results: EmojiData[] = [];

  for (const emoji of EMOJI_DATA) {
    if (results.length >= limit) break;

    // Exact name match (highest priority)
    if (emoji.name === normalizedQuery) {
      results.unshift(emoji);
      continue;
    }

    // Name starts with query
    if (emoji.name.startsWith(normalizedQuery)) {
      results.push(emoji);
      continue;
    }

    // Name contains query
    if (emoji.name.includes(normalizedQuery)) {
      results.push(emoji);
      continue;
    }

    // Keyword match
    if (emoji.keywords.some((k) => k.includes(normalizedQuery))) {
      results.push(emoji);
    }
  }

  return results.slice(0, limit);
}

/** Get emojis by category */
export function getEmojisByCategory(category: EmojiCategory): EmojiData[] {
  return EMOJI_DATA.filter((e) => e.category === category);
}

/** Get all categories with their emojis */
export function getGroupedEmojis(): Map<EmojiCategory, EmojiData[]> {
  const groups = new Map<EmojiCategory, EmojiData[]>();

  for (const emoji of EMOJI_DATA) {
    const existing = groups.get(emoji.category) || [];
    existing.push(emoji);
    groups.set(emoji.category, existing);
  }

  return groups;
}

/** Frequently used emojis (can be customized based on usage tracking) */
export const FREQUENT_EMOJIS: EmojiData[] = [
  EMOJI_DATA.find((e) => e.name === 'thumbsup')!,
  EMOJI_DATA.find((e) => e.name === 'heart')!,
  EMOJI_DATA.find((e) => e.name === 'joy')!,
  EMOJI_DATA.find((e) => e.name === 'fire')!,
  EMOJI_DATA.find((e) => e.name === 'check')!,
  EMOJI_DATA.find((e) => e.name === 'rocket')!,
  EMOJI_DATA.find((e) => e.name === 'sparkles')!,
  EMOJI_DATA.find((e) => e.name === 'thinking')!,
].filter(Boolean);

/** Category labels for display */
export const EMOJI_CATEGORY_LABELS: Record<EmojiCategory, string> = {
  smileys: 'Smileys & Emotion',
  people: 'People & Body',
  animals: 'Animals & Nature',
  food: 'Food & Drink',
  activities: 'Activities',
  travel: 'Travel & Places',
  objects: 'Objects',
  symbols: 'Symbols',
  flags: 'Flags',
};
