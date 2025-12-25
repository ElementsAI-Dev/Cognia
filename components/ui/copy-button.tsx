'use client';

/**
 * Enhanced Copy Button Component - unified copy functionality with format options
 */

import { useState, forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCopy, type CopyFormat, addToCopyHistory } from '@/hooks/use-copy';

type ButtonProps = React.ComponentProps<typeof Button>;

export interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'content'> {
  content: string | (() => string);
  format?: CopyFormat;
  showFormatSelector?: boolean;
  availableFormats?: CopyFormat[];
  tooltip?: string;
  successDuration?: number;
  onCopySuccess?: () => void;
  onCopyError?: (error: Error) => void;
  showToast?: boolean;
  toastMessage?: string;
  iconOnly?: boolean;
  saveToHistory?: boolean;
}

const FORMAT_LABELS: Record<CopyFormat, string> = {
  text: 'Plain Text',
  markdown: 'Markdown',
  json: 'JSON',
  html: 'HTML',
};

export const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    {
      content,
      format = 'text',
      showFormatSelector = false,
      availableFormats = ['text', 'markdown', 'json'],
      tooltip = 'Copy to clipboard',
      successDuration = 2000,
      onCopySuccess,
      onCopyError,
      showToast = true,
      toastMessage,
      iconOnly = false,
      saveToHistory = true,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isCopied, setIsCopied] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState<CopyFormat>(format);
    const { copy, isCopying } = useCopy({ showToast, toastMessage });

    const getContent = (): string => {
      return typeof content === 'function' ? content() : content;
    };

    const handleCopy = async (copyFormat: CopyFormat = selectedFormat) => {
      const textContent = getContent();
      if (!textContent) return;

      const result = await copy(textContent, {
        format: copyFormat,
        onSuccess: () => {
          setIsCopied(true);
          if (saveToHistory) {
            addToCopyHistory(textContent, copyFormat);
          }
          onCopySuccess?.();
          setTimeout(() => setIsCopied(false), successDuration);
        },
        onError: onCopyError,
      });

      return result;
    };

    const handleFormatSelect = async (newFormat: CopyFormat) => {
      setSelectedFormat(newFormat);
      await handleCopy(newFormat);
    };

    const Icon = isCopied ? Check : Copy;
    const iconClass = cn(
      'h-4 w-4 transition-all',
      isCopied && 'text-green-500'
    );

    const buttonContent = (
      <>
        <Icon className={iconClass} />
        {!iconOnly && children}
      </>
    );

    // Simple button without format selector
    if (!showFormatSelector) {
      const button = (
        <Button
          ref={ref}
          variant="ghost"
          size={iconOnly ? 'icon' : 'sm'}
          className={cn(iconOnly && 'h-8 w-8', className)}
          onClick={() => handleCopy()}
          disabled={disabled || isCopying}
          {...props}
        >
          {buttonContent}
        </Button>
      );

      if (tooltip) {
        return (
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>
              <p>{isCopied ? 'Copied!' : tooltip}</p>
            </TooltipContent>
          </Tooltip>
        );
      }

      return button;
    }

    // Button with format dropdown
    return (
      <div className={cn('flex items-center gap-0.5', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              variant="ghost"
              size={iconOnly ? 'icon' : 'sm'}
              className={cn(
                'rounded-r-none',
                iconOnly && 'h-8 w-8'
              )}
              onClick={() => handleCopy()}
              disabled={disabled || isCopying}
              {...props}
            >
              {buttonContent}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isCopied ? 'Copied!' : `Copy as ${FORMAT_LABELS[selectedFormat]}`}</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-6 rounded-l-none border-l"
              disabled={disabled || isCopying}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableFormats.map((fmt: CopyFormat) => (
              <DropdownMenuItem
                key={fmt}
                onClick={() => handleFormatSelect(fmt)}
                className={cn(selectedFormat === fmt && 'bg-accent')}
              >
                Copy as {FORMAT_LABELS[fmt]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
);

CopyButton.displayName = 'CopyButton';

/**
 * Inline copy button for code blocks and text areas
 */
export interface InlineCopyButtonProps {
  content: string;
  className?: string;
}

export function InlineCopyButton({ content, className }: InlineCopyButtonProps) {
  const t = useTranslations('common');
  const [isCopied, setIsCopied] = useState(false);
  const { copy } = useCopy({ showToast: false });

  const handleCopy = async () => {
    const result = await copy(content);
    if (result.success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center justify-center rounded p-1',
        'text-muted-foreground hover:text-foreground hover:bg-muted',
        'transition-colors',
        className
      )}
      aria-label={t('copy')}
    >
      {isCopied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export default CopyButton;
