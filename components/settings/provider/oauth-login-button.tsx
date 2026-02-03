'use client';

/**
 * OAuthLoginButton - Quick login button for providers that support OAuth
 * Currently supports: OpenRouter (PKCE flow)
 */

import { useState, useEffect, useCallback } from 'react';
import { LogIn, Loader2, Check, AlertCircle, Unlink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { buildOAuthUrl, getOAuthState, clearOAuthState } from '@/lib/ai/providers/oauth';
import { useSettingsStore } from '@/stores';
import { PROVIDERS } from '@/types/provider';
import { cn } from '@/lib/utils';

interface OAuthLoginButtonProps {
  providerId: string;
  onSuccess?: (apiKey: string) => void;
  onError?: (error: string) => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function OAuthLoginButton({
  providerId,
  onSuccess: _onSuccess,
  onError: _onError,
  variant = 'outline',
  size = 'sm',
  className,
}: OAuthLoginButtonProps) {
  const t = useTranslations('providers');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const updateProviderSettings = useSettingsStore((state) => state.updateProviderSettings);
  
  const provider = PROVIDERS[providerId];
  const settings = providerSettings[providerId];
  const isConnected = settings?.oauthConnected && settings?.apiKey;
  
  // Check if OAuth token is expired
  const isExpired = settings?.oauthExpiresAt && settings.oauthExpiresAt < Date.now();
  const isExpiringSoon = settings?.oauthExpiresAt && 
    settings.oauthExpiresAt > Date.now() && 
    settings.oauthExpiresAt < Date.now() + 24 * 60 * 60 * 1000; // expires within 24 hours
  
  // Check for OAuth callback parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthProvider = params.get('oauth_provider');
    const oauthCode = params.get('oauth_code');
    const oauthError = params.get('oauth_error');
    
    if (oauthProvider !== providerId) return;
    
    // Clean up URL
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
    
    if (oauthError) {
      setError(oauthError === 'no_code' ? 'No authorization code received' : oauthError);
      clearOAuthState();
      return;
    }
    
    if (oauthCode) {
      // Handle OAuth callback inline to avoid dependency issues
      (async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          const storedState = getOAuthState();
          if (!storedState || storedState.providerId !== providerId) {
            throw new Error('OAuth state mismatch');
          }
          
          const response = await fetch(`/api/oauth/${providerId}/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: oauthCode,
              codeVerifier: storedState.codeVerifier,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to exchange code');
          }
          
          const data = await response.json();
          
          updateProviderSettings(providerId, {
            apiKey: data.apiKey,
            enabled: true,
            oauthConnected: true,
            oauthExpiresAt: data.expiresAt,
          });
          
          clearOAuthState();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'OAuth failed';
          setError(message);
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [providerId, updateProviderSettings]);
  
  const handleLogin = useCallback(async () => {
    if (!provider?.supportsOAuth) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await buildOAuthUrl(providerId);
      if (!result) {
        throw new Error('Failed to build OAuth URL');
      }
      
      // Redirect to OAuth provider
      window.location.href = result.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start OAuth';
      setError(message);
      setIsLoading(false);
    }
  }, [providerId, provider]);
  
  const handleDisconnect = useCallback(() => {
    updateProviderSettings(providerId, {
      apiKey: '',
      oauthConnected: false,
      oauthExpiresAt: undefined,
    });
  }, [providerId, updateProviderSettings]);
  
  if (!provider?.supportsOAuth) return null;
  
  // Show re-login prompt if token is expired
  if (isConnected && isExpired) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={size}
              onClick={handleLogin}
              disabled={isLoading}
              className={cn('border-amber-500 text-amber-600 hover:bg-amber-50', className)}
            >
              <AlertCircle className="h-4 w-4 mr-1 text-amber-500" />
              {t('oauthExpired') || 'Token Expired'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {t('oauthExpiredHint') || 'Your OAuth token has expired. Click to re-authenticate.'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (isConnected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={size}
              onClick={handleDisconnect}
              className={className}
            >
              {isExpiringSoon ? (
                <AlertCircle className="h-4 w-4 mr-1 text-amber-500" />
              ) : (
                <Check className="h-4 w-4 mr-1 text-green-500" />
              )}
              {t('oauthConnected')}
              <Unlink className="h-3 w-3 ml-1 opacity-50" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isExpiringSoon 
              ? (t('oauthExpiringSoonHint') || 'Token expires soon. Consider re-authenticating.')
              : t('oauthDisconnectHint')
            }
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleLogin}
            disabled={isLoading}
            className={className}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : error ? (
              <AlertCircle className="h-4 w-4 mr-1 text-destructive" />
            ) : (
              <LogIn className="h-4 w-4 mr-1" />
            )}
            {t('oauthLogin')}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {error || t('oauthLoginHint', { provider: provider.name })}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
