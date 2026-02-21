import { nanoid } from 'nanoid';
import { isTauri } from '@/lib/utils';
import { storageFeatureFlags } from './feature-flags';
import { loggers } from '@/lib/logger';

const log = loggers.store;

const WEB_BACKUP_KEY_STORAGE = 'cognia-backup-encryption-key-v1';
const STRONGHOLD_BACKUP_KEY = 'backup:encryption:key:v1';

function generateKeyMaterial(): string {
  if (globalThis.crypto?.randomUUID) {
    return `${globalThis.crypto.randomUUID()}-${nanoid(20)}`;
  }
  return nanoid(48);
}

async function getDesktopBackupKey(): Promise<string | null> {
  try {
    const { isStrongholdAvailable, secureGetSyncCredential, secureStoreSyncCredential } = await import(
      '@/lib/native/stronghold-integration'
    );

    if (!isStrongholdAvailable()) {
      return null;
    }

    const existing = await secureGetSyncCredential('backup', STRONGHOLD_BACKUP_KEY);
    if (existing) {
      return existing;
    }

    const generated = generateKeyMaterial();
    const saved = await secureStoreSyncCredential('backup', STRONGHOLD_BACKUP_KEY, generated);
    return saved ? generated : null;
  } catch (error) {
    log.warn('Failed to get desktop backup key from stronghold', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function getWebBackupKey(): string {
  const existing = localStorage.getItem(WEB_BACKUP_KEY_STORAGE);
  if (existing) {
    return existing;
  }

  const generated = generateKeyMaterial();
  localStorage.setItem(WEB_BACKUP_KEY_STORAGE, generated);
  return generated;
}

export async function getDefaultBackupPassphrase(): Promise<string | null> {
  if (!storageFeatureFlags.encryptedBackupV3Enabled) {
    return null;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  if (isTauri()) {
    return getDesktopBackupKey();
  }

  return getWebBackupKey();
}
