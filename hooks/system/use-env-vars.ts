/**
 * useEnvVars Hook - React hook for environment variables management
 *
 * Provides a convenient interface for:
 * - Listing environment variables
 * - Creating/updating/deleting variables
 * - Importing/exporting .env files
 * - Filtering by category
 */

import { useCallback, useState } from 'react';
import {
  listEnvVars,
  upsertEnvVar,
  deleteEnvVar,
  importEnvFile,
  exportEnvFile,
} from '@/lib/native/environment';
import type {
  EnvVariable,
  EnvVarCategory,
  EnvFileImportOptions,
  EnvFileExportOptions,
} from '@/types/system/environment';
import { isTauri } from '@/lib/utils';

export interface UseEnvVarsReturn {
  // State
  envVars: EnvVariable[];
  filteredEnvVars: EnvVariable[];
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean;

  // Filter state
  searchQuery: string;
  categoryFilter: EnvVarCategory | 'all';

  // Actions
  refreshEnvVars: () => Promise<void>;
  addEnvVar: (key: string, value: string, category?: EnvVarCategory, isSecret?: boolean) => Promise<EnvVariable | null>;
  updateEnvVar: (key: string, value: string, category?: EnvVarCategory, isSecret?: boolean) => Promise<EnvVariable | null>;
  removeEnvVar: (key: string) => Promise<boolean>;
  importFromFile: (content: string, options?: EnvFileImportOptions) => Promise<EnvVariable[]>;
  exportToFile: (options?: EnvFileExportOptions) => Promise<string>;

  // Filter actions
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: EnvVarCategory | 'all') => void;
  clearFilters: () => void;
  clearError: () => void;
}

export function useEnvVars(): UseEnvVarsReturn {
  const [envVars, setEnvVars] = useState<EnvVariable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EnvVarCategory | 'all'>('all');

  const isAvailable = isTauri();

  // Compute filtered env vars
  const filteredEnvVars = envVars.filter((envVar) => {
    const matchesSearch =
      searchQuery === '' ||
      envVar.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (!envVar.isSecret && envVar.value.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || envVar.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const refreshEnvVars = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const vars = await listEnvVars();
      setEnvVars(vars);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  const addEnvVar = useCallback(
    async (
      key: string,
      value: string,
      category?: EnvVarCategory,
      isSecret?: boolean
    ): Promise<EnvVariable | null> => {
      if (!isAvailable) return null;

      setError(null);

      try {
        const newVar = await upsertEnvVar({ key, value, category, isSecret });
        setEnvVars((prev) => {
          const exists = prev.some((v) => v.key === key);
          if (exists) {
            return prev.map((v) => (v.key === key ? newVar : v));
          }
          return [...prev, newVar];
        });
        return newVar;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [isAvailable]
  );

  const updateEnvVar = useCallback(
    async (
      key: string,
      value: string,
      category?: EnvVarCategory,
      isSecret?: boolean
    ): Promise<EnvVariable | null> => {
      return addEnvVar(key, value, category, isSecret);
    },
    [addEnvVar]
  );

  const removeEnvVar = useCallback(
    async (key: string): Promise<boolean> => {
      if (!isAvailable) return false;

      setError(null);

      try {
        const success = await deleteEnvVar(key);
        if (success) {
          setEnvVars((prev) => prev.filter((v) => v.key !== key));
        }
        return success;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      }
    },
    [isAvailable]
  );

  const importFromFile = useCallback(
    async (content: string, options?: EnvFileImportOptions): Promise<EnvVariable[]> => {
      if (!isAvailable) return [];

      setIsLoading(true);
      setError(null);

      try {
        const imported = await importEnvFile(content, options);
        // Refresh to get updated list
        const vars = await listEnvVars();
        setEnvVars(vars);
        return imported;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [isAvailable]
  );

  const exportToFile = useCallback(
    async (options?: EnvFileExportOptions): Promise<string> => {
      if (!isAvailable) return '';

      setError(null);

      try {
        return await exportEnvFile(options);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return '';
      }
    },
    [isAvailable]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('all');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    envVars,
    filteredEnvVars,
    isLoading,
    error,
    isAvailable,
    searchQuery,
    categoryFilter,
    refreshEnvVars,
    addEnvVar,
    updateEnvVar,
    removeEnvVar,
    importFromFile,
    exportToFile,
    setSearchQuery,
    setCategoryFilter,
    clearFilters,
    clearError,
  };
}
