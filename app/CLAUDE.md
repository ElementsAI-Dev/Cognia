[根目录](../CLAUDE.md) > **app**

---

# app Module Documentation

## Module Responsibility

Next.js App Router - main application routes, layouts, and pages. This module defines the application structure and routing.

## Directory Structure

### Route Groups

- `(main)/` — Main application routes
  - `(chat)/` — Chat interface
  - `settings/` — Settings pages
  - `native-tools/` — Native tools dashboard
  - `skills/` — Skills management
  - `splashscreen/` — Splash screen
  - `git/` — Git integration
  - `ppt/` — PPT generation
  - `image-studio/` — Image editing
  - `academic/` — Academic mode
  - `video-studio/` — Video editing
  - `workflows/` — Workflow management
  - `designer/` — Visual designer
  - `projects/` — Project management

### Standalone Windows

- `(standalone-selection-toolbar)/` — Selection toolbar window
- `(standalone-assistant-bubble)/` — Assistant bubble window
- `(standalone-chat-widget)/` — Chat widget window
- `(standalone-region-selector)/` — Region selector window

### Root Files

- `layout.tsx` — Root layout (not present, using app providers)
- `page.tsx` — Root page (not present)
- `globals.css` — Global styles
- `providers.tsx` — React providers

## Entry Points

- `app/providers.tsx` — Root providers setup
- `app/globals.css` — Global styles and Tailwind v4 config
- `app/(main)/layout.tsx` — Main layout
- `app/(main)/(chat)/page.tsx` — Main chat page

## Key Dependencies

- **Next.js**: App Router, React Server Components
- **React**: 19.2
- **UI**: shadcn/ui, Radix UI, Lucide icons
- **Styling**: Tailwind CSS v4
- **State**: Zustand
- **i18n**: next-intl

## Layout Architecture

### Root Providers (`app/providers.tsx`)

Sets up global React providers:

- CacheProvider
- LoggerProvider
- AudioProvider
- WebSocketProvider
- LocaleInitializer
- QueryClientProvider
- ThemeProvider
- TooltipProvider

### Main Layout (`app/(main)/layout.tsx`)

Main application layout with:

- Sidebar navigation
- Main content area
- Header/controls
- Mobile responsive

### Chat Layout (`app/(main)/(chat)/layout.tsx`)

Chat-specific layout with:

- Chat interface
- Sidebar with sessions
- Message list
- Input area

## Route Groups

### (main) — Main Application

Contains the primary application routes. The `(main)` group is a route group that doesn't add to the URL path.

#### (chat) — Chat Interface

- `layout.tsx` — Chat layout
- `page.tsx` — Main chat page

#### Settings Pages

- `settings/page.tsx` — Settings dashboard
- Sub-routes for various settings categories

#### Feature Pages

- `native-tools/page.tsx` — Native tools dashboard
- `skills/page.tsx` — Skills management
- `designer/page.tsx` — Visual designer
- `projects/page.tsx` — Project management
- `workflows/page.tsx` — Workflow management
- `image-studio/page.tsx` — Image editing
- `video-studio/page.tsx` — Video editing
- `academic/page.tsx` — Academic mode
- `git/page.tsx` — Git integration
- `ppt/page.tsx` — PPT generation

### Standalone Windows

These routes render in separate Tauri windows:

#### (standalone-selection-toolbar)

- `selection-toolbar/layout.tsx` — Toolbar layout
- `selection-toolbar/page.tsx` — Toolbar page

#### (standalone-assistant-bubble)

- `assistant-bubble/layout.tsx` — Bubble layout
- `assistant-bubble/page.tsx` — Bubble page

#### (standalone-chat-widget)

- `chat-widget/layout.tsx` — Widget layout
- `chat-widget/page.tsx` — Widget page

#### (standalone-region-selector)

- `region-selector/layout.tsx` — Selector layout
- `region-selector/page.tsx` — Selector page

## Styling

### Global Styles (`app/globals.css`)

Tailwind CSS v4 with `@theme inline`:

- CSS variables for colors, spacing, etc.
- Dark mode support
- Custom animations
- Base styles

### Component Styling

Components use:

- Tailwind utility classes
- `cn()` utility for class merging
- CSS variables for theming
- Dark mode via `.dark` class

## Static Export Configuration

The app uses `output: "export"` for static site generation:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: isProd ? "export" : undefined,
  images: { unoptimized: true },
  // ...
};
```

## Common Patterns

### Creating Routes

```typescript
// app/(main)/my-feature/page.tsx
export default function MyFeaturePage() {
  return (
    <div>
      <h1>My Feature</h1>
      {/* Feature content */}
    </div>
  );
}
```

### Creating Layouts

```typescript
// app/(main)/my-feature/layout.tsx
export default function MyFeatureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="feature-layout">
      <header>My Feature</header>
      <main>{children}</main>
    </div>
  );
}
```

## Testing

- **Framework**: Jest with React Testing Library
- **Coverage**: Partial
- **Test Files**: `.test.tsx` files alongside components

## Related Files

- `components/` — React components
- `lib/` — Business logic
- `stores/` — State management
- `next.config.ts` — Next.js configuration

## Constraints

### Static Export Compatibility

- No server-side API routes in production
- Tauri loads static files from `out/`
- No server-side only features
- Dynamic imports for Tauri plugins

### Window Routing

Standalone windows use specific routes:

- Selection toolbar: `/selection-toolbar`
- Chat widget: `/chat-widget`
- Assistant bubble: `/assistant-bubble`
- Region selector: `/region-selector`

## Changelog

### 2025-01-14

- Initial module documentation created
- Documented route groups and layouts
- Documented standalone windows
