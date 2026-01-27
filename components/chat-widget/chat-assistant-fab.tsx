"use client";

/**
 * Chat Assistant FAB (Floating Action Button)
 * A beautiful floating button that toggles the chat assistant panel
 * Only displays in Tauri desktop mode
 */

import { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { MessageCircle, X, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FabPosition } from "@/hooks/chat";

interface ChatAssistantFabProps {
  isOpen: boolean;
  onClick?: () => void;
  position?: FabPosition;
  offset?: { x: number; y: number };
  unreadCount?: number;
  isLoading?: boolean;
  className?: string;
  showTooltip?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
}

const positionClasses: Record<FabPosition, string> = {
  "bottom-right": "bottom-6 right-6",
  "bottom-left": "bottom-6 left-6",
  "top-right": "top-6 right-6",
  "top-left": "top-6 left-6",
};

export const ChatAssistantFab = forwardRef<HTMLButtonElement, ChatAssistantFabProps>(
  function ChatAssistantFab(
    {
      isOpen,
      onClick,
      position = "bottom-right",
      offset = { x: 0, y: 0 },
      unreadCount = 0,
      isLoading = false,
      className,
      showTooltip = true,
      onMouseDown,
      onTouchStart,
    },
    ref
  ) {
    const t = useTranslations("chatWidget.fab");

    const button = (
      <motion.button
        ref={ref}
        onClick={onClick}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className={cn(
          "fixed z-[9999] flex items-center justify-center",
          "h-14 w-14 rounded-full",
          "bg-primary text-primary-foreground",
          "shadow-lg shadow-primary/25",
          "hover:shadow-xl hover:shadow-primary/30",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "transition-shadow duration-200",
          "group",
          positionClasses[position],
          className
        )}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
        }}
        aria-label={isOpen ? t("closeAssistant") : t("openAssistant")}
        aria-expanded={isOpen}
      >
        {/* Pulsing ring animation when not open */}
        {!isOpen && (
          <>
            <motion.span
              className="absolute inset-0 rounded-full bg-primary/30"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{
                scale: [1, 1.4, 1.4],
                opacity: [0.5, 0.2, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            />
            <motion.span
              className="absolute inset-0 rounded-full bg-primary/20"
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{
                scale: [1, 1.6, 1.6],
                opacity: [0.3, 0.1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
                delay: 0.3,
              }}
            />
          </>
        )}

        {/* Icon container with rotation animation */}
        <motion.div
          className="relative flex items-center justify-center"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                <X className="h-6 w-6" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0, rotate: 90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: -90 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <MessageCircle className="h-6 w-6" />
                {/* Sparkle effect */}
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Sparkles className="h-3 w-3 text-primary-foreground/80" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Loading indicator */}
        {isLoading && !isOpen && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}

        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && !isOpen && (
            <motion.span
              className={cn(
                "absolute -top-1 -right-1",
                "flex items-center justify-center",
                "min-w-5 h-5 px-1.5 rounded-full",
                "bg-destructive text-destructive-foreground",
                "text-xs font-semibold",
                "shadow-sm"
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Hover glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        />
      </motion.button>
    );

    if (showTooltip && !isOpen) {
      return (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent
              side={position.includes("right") ? "left" : "right"}
              sideOffset={8}
            >
              <p>{t("title")}</p>
              <p className="text-xs text-muted-foreground">{t("clickToStart")}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{t("shortcutHint")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  }
);

export default ChatAssistantFab;
