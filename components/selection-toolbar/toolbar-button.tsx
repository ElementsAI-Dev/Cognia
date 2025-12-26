"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { forwardRef } from "react";

export interface ToolbarButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isLoading?: boolean;
}

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ icon: Icon, label, isActive, isLoading, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "flex items-center justify-center",
          "w-9 h-9 rounded-lg",
          "transition-all duration-200 ease-out",
          "hover:bg-white/20 hover:scale-110",
          "active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-white/30",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isActive && "bg-white/25 scale-105",
          isLoading && "animate-pulse",
          className
        )}
        title={label}
        aria-label={label}
        {...props}
      >
        <Icon
          className={cn(
            "w-4.5 h-4.5 text-white",
            "transition-transform duration-200",
            isLoading && "animate-spin"
          )}
        />
      </button>
    );
  }
);

ToolbarButton.displayName = "ToolbarButton";
