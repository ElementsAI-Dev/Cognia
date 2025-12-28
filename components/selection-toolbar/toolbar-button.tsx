"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, Loader2 } from "lucide-react";
import { forwardRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ToolbarButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  description?: string;
  isActive?: boolean;
  isLoading?: boolean;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  badge?: string | number;
}

const variantStyles = {
  default: {
    base: "text-white/90",
    hover: "hover:bg-white/15 hover:text-white",
    active: "bg-linear-to-br from-white/25 to-white/15",
  },
  primary: {
    base: "text-cyan-300",
    hover: "hover:bg-cyan-500/20 hover:text-cyan-200",
    active: "bg-linear-to-br from-cyan-500/30 to-cyan-600/20",
  },
  success: {
    base: "text-emerald-300",
    hover: "hover:bg-emerald-500/20 hover:text-emerald-200",
    active: "bg-linear-to-br from-emerald-500/30 to-emerald-600/20",
  },
  warning: {
    base: "text-amber-300",
    hover: "hover:bg-amber-500/20 hover:text-amber-200",
    active: "bg-linear-to-br from-amber-500/30 to-amber-600/20",
  },
  danger: {
    base: "text-rose-300",
    hover: "hover:bg-rose-500/20 hover:text-rose-200",
    active: "bg-linear-to-br from-rose-500/30 to-rose-600/20",
  },
};

const sizeStyles = {
  sm: { button: "w-7 h-7 rounded-md", icon: "w-3.5 h-3.5" },
  md: { button: "w-9 h-9 rounded-lg", icon: "w-4 h-4" },
  lg: { button: "w-11 h-11 rounded-xl", icon: "w-5 h-5" },
};

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (
    {
      icon: Icon,
      label,
      shortcut,
      description,
      isActive,
      isLoading,
      variant = "default",
      size = "md",
      showTooltip = true,
      badge,
      className,
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = useState(false);
    const styles = variantStyles[variant];
    const sizes = sizeStyles[size];

    const button = (
      <button
        ref={ref}
        className={cn(
          "relative flex items-center justify-center",
          sizes.button,
          "transition-all duration-200 ease-out",
          "backdrop-blur-sm",
          styles.base,
          styles.hover,
          "active:scale-90",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
          isActive && [styles.active, "scale-105 shadow-lg shadow-white/5"],
          isLoading && "cursor-wait",
          className
        )}
        aria-label={label}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {/* Glow effect on hover */}
        <div
          className={cn(
            "absolute inset-0 rounded-inherit opacity-0 transition-opacity duration-300",
            "bg-linear-to-br from-white/10 to-transparent",
            isHovered && !props.disabled && "opacity-100"
          )}
        />

        {/* Icon */}
        {isLoading ? (
          <Loader2 className={cn(sizes.icon, "animate-spin")} />
        ) : (
          <Icon
            className={cn(
              sizes.icon,
              "relative z-10",
              "transition-transform duration-200",
              isHovered && !props.disabled && "scale-110"
            )}
          />
        )}

        {/* Badge */}
        {badge !== undefined && (
          <span
            className={cn(
              "absolute -top-1 -right-1 min-w-[16px] h-4 px-1",
              "flex items-center justify-center",
              "text-[10px] font-medium",
              "bg-linear-to-br from-cyan-500 to-blue-600",
              "text-white rounded-full",
              "shadow-lg shadow-cyan-500/30",
              "animate-in zoom-in-50 duration-200"
            )}
          >
            {badge}
          </span>
        )}

        {/* Active indicator */}
        {isActive && (
          <div
            className={cn(
              "absolute -bottom-0.5 left-1/2 -translate-x-1/2",
              "w-4 h-0.5 rounded-full",
              "bg-linear-to-r from-cyan-400 to-blue-500",
              "animate-in fade-in slide-in-from-bottom-1 duration-200"
            )}
          />
        )}
      </button>
    );

    if (!showTooltip) {
      return button;
    }

    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={8}
          className={cn(
            "px-3 py-2",
            "bg-gray-900/95 backdrop-blur-xl",
            "border border-white/10",
            "shadow-xl shadow-black/30",
            "animate-in fade-in-0 zoom-in-95 duration-150"
          )}
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{label}</span>
              {shortcut && (
                <kbd
                  className={cn(
                    "px-1.5 py-0.5 text-[10px] font-mono",
                    "bg-white/10 rounded",
                    "text-white/70 border border-white/10"
                  )}
                >
                  {shortcut}
                </kbd>
              )}
            </div>
            {description && (
              <span className="text-xs text-white/60">{description}</span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }
);

ToolbarButton.displayName = "ToolbarButton";
