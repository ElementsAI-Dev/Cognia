'use client';

/**
 * SettingsSection - Unified layout components for settings pages
 * Provides consistent styling and interaction patterns
 */

import { ReactNode, useState } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

/**
 * SettingsCard - Main card wrapper with consistent styling
 */
interface SettingsCardProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  variant?: 'default' | 'bordered' | 'ghost';
}

export function SettingsCard({
  icon,
  title,
  description,
  badge,
  badgeVariant = 'secondary',
  children,
  className,
  headerAction,
  collapsible = false,
  defaultOpen = true,
  variant = 'default',
}: SettingsCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const cardClassName = cn(
    'transition-all duration-200',
    variant === 'ghost' && 'border-dashed bg-muted/30',
    variant === 'bordered' && 'border-2',
    className
  );

  const content = (
    <Card className={cardClassName}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {icon && (
              <div className="shrink-0 text-muted-foreground">{icon}</div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{title}</CardTitle>
                {badge && (
                  <Badge variant={badgeVariant} className="text-[10px]">
                    {badge}
                  </Badge>
                )}
              </div>
              {description && (
                <CardDescription className="text-xs mt-0.5">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
          {collapsible && (
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );

  if (collapsible) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer">{content}</div>
        </CollapsibleTrigger>
      </Collapsible>
    );
  }

  return content;
}

/**
 * SettingsRow - Horizontal row for toggle settings
 */
interface SettingsRowProps {
  icon?: ReactNode;
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SettingsRow({
  icon,
  label,
  description,
  children,
  className,
  disabled,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors',
        disabled && 'opacity-50',
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {icon && (
          <div className="shrink-0 mt-0.5 text-muted-foreground">{icon}</div>
        )}
        <div className="min-w-0 flex-1 space-y-0.5">
          <Label className="text-sm font-medium">{label}</Label>
          {description && (
            <p className="text-[10px] text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * SettingsToggle - Pre-built toggle row with Switch
 */
interface SettingsToggleProps {
  id: string;
  icon?: ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function SettingsToggle({
  id,
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: SettingsToggleProps) {
  return (
    <SettingsRow
      icon={icon}
      label={label}
      description={description}
      disabled={disabled}
      className={className}
    >
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </SettingsRow>
  );
}

/**
 * SettingsGrid - Responsive grid for multiple settings
 */
interface SettingsGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

export function SettingsGrid({
  children,
  columns = 2,
  className,
}: SettingsGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <div className={cn('grid gap-3', gridCols[columns], className)}>
      {children}
    </div>
  );
}

/**
 * SettingsDivider - Visual separator with optional label
 */
interface SettingsDividerProps {
  label?: string;
  className?: string;
}

export function SettingsDivider({ label, className }: SettingsDividerProps) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3 py-2', className)}>
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return <div className={cn('h-px bg-border my-4', className)} />;
}

/**
 * SettingsGroup - Collapsible group of settings
 */
interface SettingsGroupProps {
  title: string;
  icon?: ReactNode;
  badge?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function SettingsGroup({
  title,
  icon,
  badge,
  children,
  defaultOpen = false,
  className,
}: SettingsGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn('border rounded-lg', className)}
    >
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors rounded-t-lg">
          <div className="flex items-center gap-2">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <span className="text-sm font-medium">{title}</span>
            {badge && (
              <Badge variant="secondary" className="text-[10px]">
                {badge}
              </Badge>
            )}
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-3 pt-0 space-y-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * SaveButton - Button with loading and success states
 */
interface SaveButtonProps {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
}

export function SaveButton({
  onClick,
  disabled,
  children = 'Save',
  className,
}: SaveButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onClick();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn('min-w-[80px] transition-all', className)}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : showSuccess ? (
        <>
          <Check className="h-4 w-4 mr-1" />
          Saved
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * SettingsPageHeader - Page-level header for settings sections
 */
interface SettingsPageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function SettingsPageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: SettingsPageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 mt-2 sm:mt-0">{actions}</div>}
    </div>
  );
}

/**
 * SettingsAlert - Contextual alert for settings sections
 */
interface SettingsAlertProps {
  variant?: 'default' | 'info' | 'success' | 'warning' | 'destructive';
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function SettingsAlert({
  variant = 'default',
  icon,
  title,
  children,
  className,
  action,
}: SettingsAlertProps) {
  const variantStyles = {
    default: 'bg-muted/50 border-muted-foreground/20',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400',
    success: 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400',
    destructive: 'bg-destructive/10 border-destructive/30 text-destructive',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        variantStyles[variant],
        className
      )}
    >
      {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium text-sm mb-0.5">{title}</p>}
        <div className="text-xs">{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * SettingsEmptyState - Empty state for settings sections
 */
interface SettingsEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SettingsEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: SettingsEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-8 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-3 text-muted-foreground opacity-50">{icon}</div>
      )}
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
