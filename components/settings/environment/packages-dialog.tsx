'use client';

/**
 * PackagesDialog - Dialog for managing packages in virtual environments
 * Extracted from components/settings/system/virtual-env-panel.tsx
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Trash2,
  Package,
  Loader2,
  Search,
  ArrowUpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import type { PackageInfo } from '@/types/system/environment';

export interface PackagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envName: string;
  envPath: string;
  packages: PackageInfo[];
  isLoading: boolean;
  onInstall: (packages: string[]) => Promise<void>;
  onUninstall: (packages: string[]) => Promise<void>;
  onUpgradeAll: () => Promise<void>;
  isInstalling: boolean;
}

export function PackagesDialog({
  open,
  onOpenChange,
  envName,
  packages,
  isLoading,
  onInstall,
  onUninstall,
  onUpgradeAll,
  isInstalling,
}: PackagesDialogProps) {
  const t = useTranslations('virtualEnv');
  const [newPackages, setNewPackages] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  const filteredPackages = packages.filter((pkg) =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInstall = async () => {
    const packageList = newPackages
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (packageList.length > 0) {
      await onInstall(packageList);
      setNewPackages('');
    }
  };

  const handleUninstallSelected = async () => {
    if (selectedPackages.length > 0) {
      await onUninstall(selectedPackages);
      setSelectedPackages([]);
    }
  };

  const togglePackageSelection = (name: string) => {
    setSelectedPackages((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('packagesIn', { name: envName })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Install new packages */}
          <div className="flex gap-2">
            <Input
              value={newPackages}
              onChange={(e) => setNewPackages(e.target.value)}
              placeholder={t('enterPackages')}
              className="h-8 text-sm flex-1"
            />
            <Button
              size="sm"
              onClick={handleInstall}
              disabled={!newPackages || isInstalling}
            >
              {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Search and actions */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPackages')}
                className="h-8 text-sm pl-7"
              />
            </div>
            {selectedPackages.length > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleUninstallSelected}
                disabled={isInstalling}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {selectedPackages.length}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onUpgradeAll}
              disabled={isInstalling || packages.length === 0}
            >
              <ArrowUpCircle className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Package list */}
          <ScrollArea className="h-[300px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                {searchQuery ? t('noMatchingPackages') : t('noPackages')}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredPackages.map((pkg) => (
                  <div
                    key={pkg.name}
                    className={`flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer ${selectedPackages.includes(pkg.name) ? 'bg-primary/10' : ''}`}
                    onClick={() => togglePackageSelection(pkg.name)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedPackages.includes(pkg.name)}
                        onCheckedChange={() => togglePackageSelection(pkg.name)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-sm font-mono">{pkg.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {pkg.version}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PackagesDialog;
