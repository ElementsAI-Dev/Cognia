function readBooleanFlag(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value === '1' || value.toLowerCase() === 'true';
}

export const storageFeatureFlags = {
  chatPersistenceV3Enabled: readBooleanFlag('NEXT_PUBLIC_CHAT_PERSISTENCE_V3_ENABLED', true),
  desktopSqliteEnabled: readBooleanFlag('NEXT_PUBLIC_DESKTOP_SQLITE_ENABLED', true),
  encryptedBackupV3Enabled: readBooleanFlag('NEXT_PUBLIC_ENCRYPTED_BACKUP_V3_ENABLED', true),
} as const;
