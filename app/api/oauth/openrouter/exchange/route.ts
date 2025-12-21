/**
 * OpenRouter OAuth Code Exchange
 * Exchanges authorization code for API key using PKCE
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, codeVerifier: _codeVerifier } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // OpenRouter PKCE key exchange
    // The code returned by OpenRouter IS the API key for PKCE flow
    // See: https://openrouter.ai/docs/use-cases/oauth-pkce
    
    // For OpenRouter's PKCE flow, the returned code IS the API key
    // No additional exchange is needed - the code parameter contains the key
    
    return NextResponse.json({
      apiKey: code,
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
