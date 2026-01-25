export const TRANSPARENCY_CONFIG = {
  // Main container (TitleBar, Cards, Filters)
  container: "bg-background/40 backdrop-blur-md border-white/10",
  
  // Alternative lighter transparency (for nested or lighter elements)
  subtle: "bg-background/20 backdrop-blur-sm border-white/5",
  
  // Interactive elements (Buttons, Inputs)
  interactive: "bg-background/20 border-white/10 hover:bg-background/30 transition-colors",
  
  // Card elements
  card: "bg-card/40 backdrop-blur-md border-white/10",
  
  // Text colors for better contrast on transparent backgrounds
  text: "text-foreground",
  textMuted: "text-muted-foreground/80",
  
  // Default fallback (opaque)
  default: "bg-background",
  defaultCard: "bg-card",
  
  // Helper to conditionally apply classes
  get: (condition: boolean | undefined, type: 'container' | 'subtle' | 'interactive' = 'container', fallback = '') => {
    return condition ? TRANSPARENCY_CONFIG[type] : fallback;
  }
} as const;
