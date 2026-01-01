/**
 * OpenRouter OAuth Code Exchange
 * Exchanges authorization code for API key using PKCE
 * https://openrouter.ai/docs/guides/overview/auth/oauth
 */

import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_KEYS_ENDPOINT = 'https://openrouter.ai/api/v1/auth/keys';

export async function POST(request: NextRequest) {
  try {
    const { code, codeVerifier } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Exchange code for API key via OpenRouter API
    // See: https://openrouter.ai/docs/guides/overview/auth/oauth
    const exchangeBody: Record<string, string> = { code };
    
    // Add PKCE verifier if provided (required when code_challenge was used)
    if (codeVerifier) {
      exchangeBody.code_verifier = codeVerifier;
      exchangeBody.code_challenge_method = 'S256';
    }

    const response = await fetch(OPENROUTER_KEYS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(exchangeBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to exchange code for API key';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        if (errorText) errorMessage = errorText;
      }
      
      // Map OpenRouter error codes to user-friendly messages
      if (response.status === 400) {
        errorMessage = 'Invalid code_challenge_method. Ensure S256 is used consistently.';
      } else if (response.status === 403) {
        errorMessage = 'Invalid code or code_verifier. Please try logging in again.';
      } else if (response.status === 405) {
        errorMessage = 'Method not allowed. Please contact support.';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // OpenRouter returns { key: "sk-or-..." }
    const apiKey = data.key;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No API key received from OpenRouter' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      apiKey,
      provider: 'openrouter',
      success: true,
    });
  } catch (error) {
    console.error('OpenRouter OAuth exchange error:', error);
    return NextResponse.json(
      { error: 'Failed to exchange code for API key' },
      { status: 500 }
    );
  }
}
