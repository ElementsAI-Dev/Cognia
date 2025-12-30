'use client';

/**
 * EmojiBlock - Emoji renderer with larger display for emoji-only messages
 * Features:
 * - Large emoji display for emoji-only content
 * - Emoji name tooltip
 * - Twemoji support (optional)
 */

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EmojiBlockProps {
  content: string;
  className?: string;
  showTooltip?: boolean;
  useTwemoji?: boolean;
}

// Common emoji name mappings
const emojiNames: Record<string, string> = {
  '😀': 'grinning face',
  '😃': 'grinning face with big eyes',
  '😄': 'grinning face with smiling eyes',
  '😁': 'beaming face with smiling eyes',
  '😅': 'grinning face with sweat',
  '😂': 'face with tears of joy',
  '🤣': 'rolling on the floor laughing',
  '😊': 'smiling face with smiling eyes',
  '😇': 'smiling face with halo',
  '🙂': 'slightly smiling face',
  '😉': 'winking face',
  '😌': 'relieved face',
  '😍': 'smiling face with heart-eyes',
  '🥰': 'smiling face with hearts',
  '😘': 'face blowing a kiss',
  '😗': 'kissing face',
  '😙': 'kissing face with smiling eyes',
  '😚': 'kissing face with closed eyes',
  '😋': 'face savoring food',
  '😛': 'face with tongue',
  '😜': 'winking face with tongue',
  '🤪': 'zany face',
  '😝': 'squinting face with tongue',
  '🤑': 'money-mouth face',
  '🤗': 'smiling face with open hands',
  '🤭': 'face with hand over mouth',
  '🤫': 'shushing face',
  '🤔': 'thinking face',
  '🤐': 'zipper-mouth face',
  '🤨': 'face with raised eyebrow',
  '😐': 'neutral face',
  '😑': 'expressionless face',
  '😶': 'face without mouth',
  '😏': 'smirking face',
  '😒': 'unamused face',
  '🙄': 'face with rolling eyes',
  '😬': 'grimacing face',
  '😮‍💨': 'face exhaling',
  '🤥': 'lying face',
  '😔': 'pensive face',
  '😪': 'sleepy face',
  '🤤': 'drooling face',
  '😴': 'sleeping face',
  '😷': 'face with medical mask',
  '🤒': 'face with thermometer',
  '🤕': 'face with head-bandage',
  '🤢': 'nauseated face',
  '🤮': 'face vomiting',
  '🤧': 'sneezing face',
  '🥵': 'hot face',
  '🥶': 'cold face',
  '🥴': 'woozy face',
  '😵': 'face with crossed-out eyes',
  '🤯': 'exploding head',
  '🤠': 'cowboy hat face',
  '🥳': 'partying face',
  '🥸': 'disguised face',
  '😎': 'smiling face with sunglasses',
  '🤓': 'nerd face',
  '🧐': 'face with monocle',
  '😕': 'confused face',
  '😟': 'worried face',
  '🙁': 'slightly frowning face',
  '☹️': 'frowning face',
  '😮': 'face with open mouth',
  '😯': 'hushed face',
  '😲': 'astonished face',
  '😳': 'flushed face',
  '🥺': 'pleading face',
  '😦': 'frowning face with open mouth',
  '😧': 'anguished face',
  '😨': 'fearful face',
  '😰': 'anxious face with sweat',
  '😥': 'sad but relieved face',
  '😢': 'crying face',
  '😭': 'loudly crying face',
  '😱': 'face screaming in fear',
  '😖': 'confounded face',
  '😣': 'persevering face',
  '😞': 'disappointed face',
  '😓': 'downcast face with sweat',
  '😩': 'weary face',
  '😫': 'tired face',
  '🥱': 'yawning face',
  '😤': 'face with steam from nose',
  '😡': 'pouting face',
  '😠': 'angry face',
  '🤬': 'face with symbols on mouth',
  '👍': 'thumbs up',
  '👎': 'thumbs down',
  '👏': 'clapping hands',
  '🙌': 'raising hands',
  '🤝': 'handshake',
  '🙏': 'folded hands',
  '❤️': 'red heart',
  '💔': 'broken heart',
  '💯': 'hundred points',
  '✅': 'check mark button',
  '❌': 'cross mark',
  '⭐': 'star',
  '🌟': 'glowing star',
  '🔥': 'fire',
  '💡': 'light bulb',
  '🎉': 'party popper',
  '🎊': 'confetti ball',
  '🚀': 'rocket',
};

/**
 * Check if a string contains only emoji characters
 */
function isEmojiOnly(str: string): boolean {
  // Remove whitespace and check if remaining characters are all emoji
  const cleaned = str.replace(/\s/g, '');
  if (!cleaned) return false;

  // Emoji regex pattern (covers most common emoji)
  const emojiRegex =
    /^(?:[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|\u{FE0F}|\u{200D})+$/u;

  return emojiRegex.test(cleaned);
}

/**
 * Get emoji name for tooltip
 */
function getEmojiName(emoji: string): string | undefined {
  return emojiNames[emoji];
}

/**
 * Count emoji in a string
 */
function countEmoji(str: string): number {
  const emojiRegex =
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu;
  const matches = str.match(emojiRegex);
  return matches ? matches.length : 0;
}

export const EmojiBlock = memo(function EmojiBlock({
  content,
  className,
  showTooltip = true,
}: EmojiBlockProps) {
  const { isOnlyEmoji, emojiCount, size } = useMemo(() => {
    const isOnly = isEmojiOnly(content);
    const count = countEmoji(content);

    // Determine size based on emoji count
    let sizeClass = 'text-base'; // default
    if (isOnly) {
      if (count === 1) sizeClass = 'text-6xl';
      else if (count === 2) sizeClass = 'text-5xl';
      else if (count === 3) sizeClass = 'text-4xl';
      else if (count <= 5) sizeClass = 'text-3xl';
      else if (count <= 8) sizeClass = 'text-2xl';
    }

    return { isOnlyEmoji: isOnly, emojiCount: count, size: sizeClass };
  }, [content]);

  // For non-emoji-only content, just render as-is
  if (!isOnlyEmoji) {
    return <span className={className}>{content}</span>;
  }

  // For emoji-only content, render with larger size
  const emojiName = emojiCount === 1 ? getEmojiName(content.trim()) : undefined;

  const emojiElement = (
    <span className={cn('inline-block', size, className)}>{content}</span>
  );

  if (showTooltip && emojiName) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{emojiElement}</TooltipTrigger>
        <TooltipContent>:{emojiName.replace(/\s+/g, '_')}:</TooltipContent>
      </Tooltip>
    );
  }

  return emojiElement;
});

/**
 * Check if content should be rendered as large emoji
 */
export function shouldRenderAsEmoji(content: string): boolean {
  const trimmed = content.trim();
  return isEmojiOnly(trimmed) && countEmoji(trimmed) <= 8;
}

export default EmojiBlock;
