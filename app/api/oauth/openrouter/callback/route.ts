/**
 * OpenRouter OAuth Callback Handler
 * 
 * Note: In static export mode (Tauri), this API route cannot process
 * dynamic requests. The actual OAuth flow is handled client-side.
 * This file exports a static response for build compatibility.
 */

import { NextResponse } from 'next/server';

// Required for static export
export const dynamic = 'force-static';

// Static GET handler - returns a simple HTML page that handles OAuth client-side
export function GET() {
  // Return an HTML page that extracts params and redirects client-side
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>OAuth Callback</title>
  <script>
    // Extract OAuth params from URL and redirect to settings
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const redirectUrl = new URL('/settings', window.location.origin);
    redirectUrl.searchParams.set('tab', 'providers');
    if (error) {
      redirectUrl.searchParams.set('oauth_error', error);
    } else if (code) {
      redirectUrl.searchParams.set('oauth_provider', 'openrouter');
      redirectUrl.searchParams.set('oauth_code', code);
    } else {
      redirectUrl.searchParams.set('oauth_error', 'no_code');
    }
    window.location.replace(redirectUrl.toString());
  </script>
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
