# Interaction Layer Specification

This document describes the Interaction Layer feature, which abstracts webpage elements into game artifacts (icons) that the player can discover and interact with.

## Overview

The Interaction Layer sits between the World Content (Layer 1) and the Viewport (Layer 2), creating a visual abstraction of webpage elements as game-like collectibles and points of interest.

## Layer Architecture

```
Layer 3 (Top):     Avatar (fixed center)
Layer 2:           Viewport Frame/Mask
Layer 1.5:         ★ Interaction Layer (artifacts) ★
Layer 1:           World Container (page content)
Layer 0 (Bottom):  Extended Background
```

---

## Artifact Types

The Interaction Layer scans the DOM and converts elements into artifacts based on their type:

| Element Type                                                                                                                         | Artifact    | Icon | Description                             |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ---- | --------------------------------------- |
| `<a href>`                                                                                                                           | Portal      | 🌀   | Links become swirling portals           |
| `<p>`, `<li>`, `<blockquote>`, `<figcaption>`, `<dd>`, `<dt>`, `<label>`, `<legend>`, `<summary>`, `<td>`, `<th>`, `<div>`, `<span>` | Paper       | 📜   | Text-containing elements become scrolls |
| `<h1>`-`<h6>`                                                                                                                        | Direction   | 🪧   | Headers become directional signs        |
| `<img>`                                                                                                                              | Diamond     | 💎   | Images become precious gems             |
| `.tag`                                                                                                                               | Silver Coin | 🪙   | Tag elements become silver coins        |
| `.card`                                                                                                                              | Gold Coin   | 🥇   | Card components become gold coins       |

**Note**: Paper artifacts are only created for elements that contain actual text content (not empty elements).

### Special Handling for `<div>` and `<span>`

Since `div` and `span` are generic container elements, special logic determines if they qualify as "simple text elements":

1. **No block-level children** - Must not contain divs, sections, articles, headers, lists, etc.
2. **Has direct text** - Must have text nodes directly in the element (not just in nested children)
3. **Size limit** - Must not exceed 500x500 pixels (prevents treating large layout sections as text)
4. **Inline children only** - If no direct text, may only contain inline elements like `<strong>`, `<em>`, `<a>`, etc.

```
✅ Simple text div (becomes Paper):
<div>Hello, this is some text!</div>
<div><strong>Bold</strong> and <em>italic</em> text</div>

❌ Container div (ignored):
<div>
  <p>Paragraph inside</p>
  <div>Nested div</div>
</div>
```

---

## Priority System

Complex structures take precedence over their child elements. This prevents duplicate artifacts when a card contains images, paragraphs, or links.

### Priority Order (Highest First)

```
100: Gold (.card)      - Cards are processed first
 90: Silver (.tag)     - Tags next
 50: Portal (<a>)      - Links
 40: Direction (<h1>)  - Headers
 30: Paper (<p>)       - Paragraphs
 20: Diamond (<img>)   - Images last
```

### Processing Logic

```
For each artifact type (by priority):
  For each matching element:
    IF element or ancestor already processed:
      SKIP (prevents child duplication)
    ELSE:
      Create artifact icon
      Mark element AND all descendants as processed
```

**Example**: A `.card` containing an `<img>` and `<p>`:

- Card is processed first (priority 100) → Creates Gold Coin
- Image inside card is skipped (ancestor processed)
- Paragraph inside card is skipped (ancestor processed)

---

## Artifact Positioning

Each artifact icon is positioned **randomly within the bounds** of its source element, creating a more organic, discovery-like feel:

```
┌─────────────────────────────┐
│  🌀                         │
│         Source Element      │
│                    🌀       │ ← Icons randomly placed
│     🌀                      │
└─────────────────────────────┘
```

### Position Calculation

```typescript
// Padding keeps icons away from edges (based on icon size ~30px)
const padding = 20;
const availableWidth = Math.max(rect.width - padding * 2, 0);
const availableHeight = Math.max(rect.height - padding * 2, 0);

// Random offset within available space
const randomOffsetX = availableWidth > 0 ? Math.random() * availableWidth : 0;
const randomOffsetY = availableHeight > 0 ? Math.random() * availableHeight : 0;

// Final position
posX = element.left + scrollLeft + padding + randomOffsetX;
posY = element.top + scrollTop + padding + randomOffsetY;
```

The icon uses `transform: translate(-50%, -50%)` to center on this random point.

### Edge Padding

A 20px padding is applied to prevent icons from overlapping element edges, ensuring they remain visually within the element bounds even accounting for the icon's own size.

---

## Configuration

```typescript
interaction: {
  enabled: true,                        // Enable/disable the layer
  backgroundColor: "rgba(0, 0, 50, 0.1)", // Semi-transparent tint for dev
  intro: {
    enabled: true,                      // Enable intro on first direction artifact
    icon: "🎪",                         // Custom icon (default: 🎪)
    title: "Welcome!",                  // Custom title (default: "Welcome!")
    text: "Your adventure begins here!" // Custom intro text
  }
}
```

### Background Color

The `backgroundColor` provides a slight tint over the world content for development/debugging purposes. This can be set to `transparent` for production or adjusted via CSS.

---

## Intro Feature

The first direction artifact (🪧) can be configured as a special "intro" artifact that welcomes the player to the game.

### Intro Configuration

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `enabled` | boolean | Yes | - | Enable/disable intro feature |
| `icon` | string | No | 🎪 | Custom icon for intro artifact |
| `title` | string | No | "Welcome!" | Title shown in popover header |
| `text` | string | Yes | - | Intro message displayed in popover |

### Visual Differences

When intro is enabled, the first direction artifact:

1. **Custom Icon** - Uses the configured icon (default: 🎪 tent) instead of 🪧
2. **Larger Size** - 56px font size (larger than h1's 48px)
3. **Pulsing Animation** - Warm golden glow that pulses to attract attention
4. **Custom Popover** - Shows intro text instead of header content
5. **"Start" Button** - Button says "Start" instead of "Leave"

```
Normal Direction:          Intro Direction:
    🪧 (24-48px)               🎪 (56px, pulsing)
    ↓                          ↓
┌─────────────┐          ┌─────────────┐
│ Sign        │          │ Welcome!    │
│ Header text │          │ Intro text  │
│ [Leave]     │          │ [Start]     │
└─────────────┘          └─────────────┘
```

### Starting Position

The game automatically starts centered on the first direction artifact (which is the intro artifact when enabled). This ensures players see the welcome message immediately upon starting.

---

## CSS Selectors

Artifact detection uses these CSS selectors:

```typescript
const ARTIFACT_SELECTORS = {
  gold: ".card",
  silver: ".tag",
  portal: "a[href]",
  direction: "h1, h2, h3, h4, h5, h6",
  paper: "p",
  diamond: "img, .image-placeholder",
};
```

### Custom Elements

To add new artifact types for custom elements:

1. Add the type to `ArtifactType`
2. Set priority in `ARTIFACT_PRIORITY`
3. Define icon in `ARTIFACT_ICONS`
4. Add selector in `ARTIFACT_SELECTORS`

---

## Visual Effects

### Hover Effects

All artifacts scale up on hover:

```css
.at-artifact:hover {
  transform: translate(-50%, -50%) scale(1.3);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
}
```

### Animations

| Artifact | Animation                |
| -------- | ------------------------ |
| Portal   | Continuous 360° rotation |
| Gold     | Pulsing golden glow      |
| Diamond  | Sparkling effect         |

---

## Technical Implementation

### Initialization Flow

```
1. World container created
2. Interaction layer created as child of world
3. DOM scanned for artifact elements
4. Priority-sorted processing
5. Icons created and positioned
6. Layer added between content and viewport
```

### Element Visibility Check

Only visible elements become artifacts:

```typescript
function isElementVisible(element: HTMLElement): boolean {
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    rect.width > 0 &&
    rect.height > 0
  );
}
```

### Rescan API

For dynamic content, artifacts can be rescanned:

```typescript
import { rescanArtifacts, getWorldContainer } from "./features";

// After DOM changes
rescanArtifacts(getWorldContainer());
```

---

## Future Considerations

These features are planned but not yet implemented:

- **Artifact Interaction**: Click/collision detection with artifacts
- **Inventory System**: Collecting artifacts
- **Artifact Metadata**: Store original element data for interactions
- **Dynamic Updates**: MutationObserver for automatic rescanning
- **Custom Icons**: Support for image-based icons instead of emoji
- **Artifact Animations**: Entry/exit animations when scrolling into view
