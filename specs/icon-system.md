# Icon System

The AdventureTime icon system provides a unified, themable SVG icon set for all visual elements in the application.

## Overview

All icons in the application use SVG format for:
- Crisp rendering at any size
- Consistent visual style
- Easy theming via configuration
- Better accessibility

## Icon Types

### Artifact Icons
Icons displayed on the game map for collectible items:

| Icon Name | Purpose | Default Color |
|-----------|---------|---------------|
| `portal` | Links (`<a>`) - swirling vortex | Slate blue |
| `paper` | Paragraphs (`<p>`) - scroll | Burlywood |
| `direction` | Headers (`<h1>`-`<h6>`) - signpost | Saddle brown |
| `diamond` | Images (`<img>`) - gem | Turquoise |
| `silver` | Tags (`.tag`) - coin | Silver |
| `gold` | Cards (`.card`) - treasure chest | Gold |

### Special Artifact Icons
| Icon Name | Purpose | Default Color |
|-----------|---------|---------------|
| `intro` | Starting point - tent/camp | Red |
| `dimensional` | External portal - galaxy | Purple |
| `ghost` | Collected artifact marker - star | Yellow |

### UI Icons
| Icon Name | Purpose | Default Color |
|-----------|---------|---------------|
| `inventory` | Backpack/bag button | Tan |
| `realms` | Map button | Tan |
| `close` | Close/X button | Dark brown |
| `arrow` | Selection indicator | Green |
| `navigation` | Direction indicator dot | Gold |
| `pulse` | Click indicator | Gold |

### Avatar Icon
| Icon Name | Purpose | Default Color |
|-----------|---------|---------------|
| `avatar` | Player character (explorer with hat) | Green (#4CAF50) |

## Icon Theme Configuration

Icons can be themed via the `icons` property in the app configuration:

```typescript
const config: AppConfig = {
  // ... other config
  icons: {
    // Primary colors
    strokeColor: "#2c1810",      // Main stroke/line color
    fillColor: "none",           // Fill color
    accentColor: "#d4a574",      // Accent/highlight color
    
    // Artifact-specific colors (optional)
    portalColor: "#7b68ee",      // Portal artifacts
    paperColor: "#deb887",       // Paper artifacts
    directionColor: "#8b4513",   // Direction artifacts
    diamondColor: "#40e0d0",     // Diamond artifacts
    silverColor: "#c0c0c0",      // Silver artifacts
    goldColor: "#ffd700",        // Gold artifacts
    introColor: "#e74c3c",       // Intro artifact
    dimensionalColor: "#9b59b6", // Dimensional portal
    ghostColor: "#f1c40f",       // Ghost markers
    
    // UI-specific colors (optional)
    uiStrokeColor: "#3a2a1a",    // UI element strokes
    uiAccentColor: "#d4a574",    // UI element accents
    
    // Avatar color
    avatarColor: "#4CAF50",      // Player character
  }
};
```

## Default Theme

The default theme uses a warm adventure palette:

```
┌─────────────────────────────────────────┐
│  Default Icon Theme                     │
├─────────────────────────────────────────┤
│  Stroke: #2c1810 (Dark brown)           │
│  Accent: #d4a574 (Warm tan)             │
│                                         │
│  Artifacts:                             │
│  • Portal:     #7b68ee (Slate blue)     │
│  • Paper:      #deb887 (Burlywood)      │
│  • Direction:  #8b4513 (Saddle brown)   │
│  • Diamond:    #40e0d0 (Turquoise)      │
│  • Silver:     #c0c0c0 (Silver)         │
│  • Gold:       #ffd700 (Gold)           │
│  • Intro:      #e74c3c (Red)            │
│  • Dimensional:#9b59b6 (Purple)         │
│  • Ghost:      #f1c40f (Yellow)         │
│  • Avatar:     #4CAF50 (Green)          │
└─────────────────────────────────────────┘
```

## Icon Design Principles

All icons follow these design principles:

1. **Minimalistic** - Simple, clean outlines without excessive detail
2. **Consistent stroke width** - 2px stroke for main elements, 1.5px for details
3. **24x24 viewBox** - Standard size for consistent scaling
4. **Outline-first** - Primary shapes use strokes, fills used sparingly for accents
5. **Recognizable** - Each icon clearly represents its purpose

## Usage in Code

### Getting an SVG string
```typescript
import { getIconSvg } from "../../core/icons";

// Basic usage
const svg = getIconSvg("portal", 32);

// With custom color
const svg = getIconSvg("portal", 32, "#ff0000");
```

### Getting HTML for innerHTML
```typescript
import { getIconHtml } from "../../core/icons";

element.innerHTML = `Found a ${getIconHtml("diamond", 24)} diamond!`;
```

### Creating an icon element
```typescript
import { createIconElement } from "../../core/icons";

const icon = createIconElement("inventory", 28);
container.appendChild(icon);
```

### Getting artifact icon name
```typescript
import { getArtifactIconName } from "../../core/icons";

// For a regular artifact
const iconName = getArtifactIconName("portal"); // "portal"

// For an external portal
const iconName = getArtifactIconName("portal", true); // "dimensional"

// For an intro artifact
const iconName = getArtifactIconName("direction", false, true); // "intro"
```

## File Structure

```
src/core/icons/
├── index.ts      # Exports
├── icons.ts      # Icon rendering functions and SVG definitions
└── types.ts      # TypeScript types and default theme
```

## Extending with New Icons

To add a new icon:

1. Add the icon name to `IconName` type in `types.ts`
2. Add the SVG path function to `iconPaths` in `icons.ts`
3. Optionally add a theme color property to `IconTheme`

Example SVG path function:
```typescript
myNewIcon: (color, stroke) => `
  <circle cx="12" cy="12" r="9" stroke="${stroke}" stroke-width="2" fill="none"/>
  <path d="M8 12h8" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
`,
```

