/**
 * Plugin Signature Verification
 * 
 * Verifies plugin authenticity and integrity using digital signatures.
 */

import { invoke } from '@tauri-apps/api/core';
import { loggers } from './logger';

// =============================================================================
// Types
// =============================================================================

export interface PluginSignature {
  pluginId: string;
  version: string;
  algorithm: 'ed25519' | 'rsa-sha256';
  signature: string;
  publicKey: string;
  signedAt: Date;
  expiresAt?: Date;
}

export interface SignatureVerificationResult {
  valid: boolean;
  pluginId: string;
  version: string;
  signer?: SignerInfo;
  reason?: string;
  warnings: string[];
}

export interface SignerInfo {
  name: string;
  email?: string;
  organization?: string;
  verified: boolean;
  trustedLevel: TrustLevel;
}

export type TrustLevel = 'official' | 'verified' | 'community' | 'unknown' | 'untrusted';

export interface TrustedPublisher {
  id: string;
  name: string;
  publicKey: string;
  trustLevel: TrustLevel;
  addedAt: Date;
  domains?: string[];
}

export interface SignatureConfig {
  requireSignatures: boolean;
  allowUntrusted: boolean;
  trustedPublishersOnly: boolean;
  verifyOnLoad: boolean;
  cacheVerifications: boolean;
}

// =============================================================================
// Signature Verifier
// =============================================================================

export class PluginSignatureVerifier {
  private config: SignatureConfig;
  private trustedPublishers: Map<string, TrustedPublisher> = new Map();
  private verificationCache: Map<string, SignatureVerificationResult> = new Map();

  constructor(config: Partial<SignatureConfig> = {}) {
    this.config = {
      requireSignatures: false,
      allowUntrusted: true,
      trustedPublishersOnly: false,
      verifyOnLoad: true,
      cacheVerifications: true,
      ...config,
    };
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  async initialize(): Promise<void> {
    await this.loadTrustedPublishers();
  }

  private async loadTrustedPublishers(): Promise<void> {
    try {
      // Load official trusted publishers
      const officials = await invoke<TrustedPublisher[]>('plugin_get_official_publishers');
      for (const publisher of officials) {
        this.trustedPublishers.set(publisher.id, {
          ...publisher,
          addedAt: new Date(publisher.addedAt),
        });
      }

      // Load user-added trusted publishers
      const userPublishers = await invoke<TrustedPublisher[]>('plugin_get_user_publishers');
      for (const publisher of userPublishers) {
        this.trustedPublishers.set(publisher.id, {
          ...publisher,
          addedAt: new Date(publisher.addedAt),
        });
      }
    } catch (error) {
      loggers.manager.warn('[Signature] Failed to load trusted publishers:', error);
    }
  }

  // ===========================================================================
  // Verification
  // ===========================================================================

  async verify(pluginPath: string): Promise<SignatureVerificationResult> {
    // Check cache first
    if (this.config.cacheVerifications) {
      const cached = this.verificationCache.get(pluginPath);
      if (cached) return cached;
    }

    const warnings: string[] = [];

    try {
      // Read signature file
      const signatureData = await invoke<PluginSignature | null>('plugin_read_signature', {
        pluginPath,
      });

      if (!signatureData) {
        if (this.config.requireSignatures) {
          return this.createResult(pluginPath, false, 'Signature required but not found', warnings);
        }
        warnings.push('Plugin is not signed');
        return this.createResult(pluginPath, true, undefined, warnings);
      }

      // Check expiration
      if (signatureData.expiresAt && new Date(signatureData.expiresAt) < new Date()) {
        return this.createResult(
          pluginPath,
          false,
          'Signature has expired',
          warnings,
          signatureData
        );
      }

      // Verify signature cryptographically
      const cryptoValid = await this.verifyCryptographic(pluginPath, signatureData);
      if (!cryptoValid) {
        return this.createResult(
          pluginPath,
          false,
          'Cryptographic verification failed',
          warnings,
          signatureData
        );
      }

      // Check if signer is trusted
      const signer = this.findPublisher(signatureData.publicKey);

      if (!signer) {
        if (this.config.trustedPublishersOnly) {
          return this.createResult(
            pluginPath,
            false,
            'Signer is not in trusted publishers list',
            warnings,
            signatureData
          );
        }
        warnings.push('Signer is not in trusted publishers list');
      }

      if (!this.config.allowUntrusted && (!signer || signer.trustLevel === 'untrusted')) {
        return this.createResult(
          pluginPath,
          false,
          'Untrusted publishers not allowed',
          warnings,
          signatureData
        );
      }

      const result: SignatureVerificationResult = {
        valid: true,
        pluginId: signatureData.pluginId,
        version: signatureData.version,
        signer: signer
          ? {
              name: signer.name,
              organization: signer.name,
              verified: true,
              trustedLevel: signer.trustLevel,
            }
          : {
              name: 'Unknown',
              verified: false,
              trustedLevel: 'unknown',
            },
        warnings,
      };

      if (this.config.cacheVerifications) {
        this.verificationCache.set(pluginPath, result);
      }

      return result;
    } catch (error) {
      return this.createResult(
        pluginPath,
        false,
        `Verification error: ${error instanceof Error ? error.message : String(error)}`,
        warnings
      );
    }
  }

  private async verifyCryptographic(
    pluginPath: string,
    signature: PluginSignature
  ): Promise<boolean> {
    try {
      return await invoke<boolean>('plugin_verify_signature', {
        pluginPath,
        signature: signature.signature,
        publicKey: signature.publicKey,
        algorithm: signature.algorithm,
      });
    } catch {
      return false;
    }
  }

  private createResult(
    pluginPath: string,
    valid: boolean,
    reason?: string,
    warnings: string[] = [],
    signatureData?: PluginSignature
  ): SignatureVerificationResult {
    const result: SignatureVerificationResult = {
      valid,
      pluginId: signatureData?.pluginId || this.extractPluginId(pluginPath),
      version: signatureData?.version || '',
      reason,
      warnings,
    };

    if (this.config.cacheVerifications && !valid) {
      this.verificationCache.set(pluginPath, result);
    }

    return result;
  }

  private extractPluginId(pluginPath: string): string {
    const parts = pluginPath.split(/[/\\]/);
    return parts[parts.length - 1] || 'unknown';
  }

  private findPublisher(publicKey: string): TrustedPublisher | undefined {
    for (const publisher of this.trustedPublishers.values()) {
      if (publisher.publicKey === publicKey) {
        return publisher;
      }
    }
    return undefined;
  }

  // ===========================================================================
  // Publisher Management
  // ===========================================================================

  async addTrustedPublisher(publisher: Omit<TrustedPublisher, 'addedAt'>): Promise<void> {
    const fullPublisher: TrustedPublisher = {
      ...publisher,
      addedAt: new Date(),
    };

    this.trustedPublishers.set(publisher.id, fullPublisher);

    await invoke('plugin_add_trusted_publisher', { publisher: fullPublisher });
    this.clearCache();
  }

  async removeTrustedPublisher(publisherId: string): Promise<void> {
    this.trustedPublishers.delete(publisherId);
    await invoke('plugin_remove_trusted_publisher', { publisherId });
    this.clearCache();
  }

  getTrustedPublishers(): TrustedPublisher[] {
    return Array.from(this.trustedPublishers.values());
  }

  getPublisher(publisherId: string): TrustedPublisher | undefined {
    return this.trustedPublishers.get(publisherId);
  }

  isPublisherTrusted(publicKey: string): boolean {
    return this.findPublisher(publicKey) !== undefined;
  }

  // ===========================================================================
  // Signing (for plugin developers)
  // ===========================================================================

  async signPlugin(
    pluginPath: string,
    privateKey: string,
    options: {
      algorithm?: 'ed25519' | 'rsa-sha256';
      expiresIn?: number;
    } = {}
  ): Promise<PluginSignature> {
    const signature = await invoke<PluginSignature>('plugin_create_signature', {
      pluginPath,
      privateKey,
      algorithm: options.algorithm || 'ed25519',
      expiresIn: options.expiresIn,
    });

    return {
      ...signature,
      signedAt: new Date(signature.signedAt),
      expiresAt: signature.expiresAt ? new Date(signature.expiresAt) : undefined,
    };
  }

  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    return invoke<{ publicKey: string; privateKey: string }>('plugin_generate_keypair');
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  clearCache(pluginPath?: string): void {
    if (pluginPath) {
      this.verificationCache.delete(pluginPath);
    } else {
      this.verificationCache.clear();
    }
  }

  getCachedVerification(pluginPath: string): SignatureVerificationResult | undefined {
    return this.verificationCache.get(pluginPath);
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  setConfig(config: Partial<SignatureConfig>): void {
    this.config = { ...this.config, ...config };
    if (!this.config.cacheVerifications) {
      this.verificationCache.clear();
    }
  }

  getConfig(): SignatureConfig {
    return { ...this.config };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let signatureVerifierInstance: PluginSignatureVerifier | null = null;

export function getPluginSignatureVerifier(
  config?: Partial<SignatureConfig>
): PluginSignatureVerifier {
  if (!signatureVerifierInstance) {
    signatureVerifierInstance = new PluginSignatureVerifier(config);
  }
  return signatureVerifierInstance;
}

export function resetPluginSignatureVerifier(): void {
  signatureVerifierInstance = null;
}
