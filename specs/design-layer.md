# Design Layer Specification

This document describes the Design Layer feature, which adds decorative visual elements (blobs) around artifacts to create distinct themed regions in the game world.

## Overview

The Design Layer sits below the Interaction Layer and above the World content. It renders organic blob shapes around groups of artifacts, creating visual "zones" that hint at the type of content in each area.

## Layer Stack

```
Layer 4 (Top):     Avatar (fixed center)
Layer 3:           Viewport Frame/Mask
Layer 2:           Interaction Layer (artifacts/icons)
Layer 1:           Design Layer (decorative blobs)  ← NEW
Layer 0 (Bottom):  World Container (page content)
```

## Features

### Blob Generation

- Blobs are automatically generated around artifacts based on their type
- Each artifact type has its own color scheme and optional pattern
- Blobs have organic, irregular shapes created with bezier curves

### Blob Merging

- Overlapping blobs of the same type (or merge group) are combined
- This creates larger, cohesive regions instead of many small overlapping shapes
- Merge groups allow different artifact types to share blobs (e.g., gold and silver coins)

### Visual Styling

Each blob has:
- **Semi-transparent fill**: See-through background color
- **Dotted border**: Matching color with dashed stroke
- **Optional pattern**: Background pattern (triangles, circles, waves, diamonds)

## Configuration

```typescript
design: {
  enabled: true, // Enable/disable the design layer
}
```

## Blob Styles by Artifact Type

| Artifact Type | Color | Pattern | Description |
|--------------|-------|---------|-------------|
| Paper (📜) | Green | Triangles | Forest-like, nature theme |
| Silver (🪙) | Brown | Circles | Treasure/earth theme |
| Gold (🥇) | Brown | Circles | Same as silver (merged) |
| Diamond (💎) | Blue | Diamonds | Crystal/gem theme |
| Portal (🌀) | Purple | Waves | Magical/mystical theme |
| Direction (🪧) | — | — | No blob, but connected by path |

## Direction Connections

Direction artifacts (🪧) are connected by a fluent dashed path that creates a visual "trail" through the game world.

### Path Styling
- **Color**: Dark gray (#4a4a4a)
- **Width**: 4px
- **Style**: Dashed (12px dash, 8px gap)
- **Caps**: Rounded

### Path Generation
1. Collect all direction artifact positions
2. Sort by Y position (then X for same row)
3. Create smooth quadratic bezier curves connecting all points

### Icon Size
Direction icons are displayed larger than other icons (36px vs 24px base) to make them more prominent as navigation waypoints.

## Merge Groups

Certain artifact types share the same blob style and merge together:

```typescript
BLOB_MERGE_GROUPS: [
  ["silver", "gold"], // Coins merge into treasure zones
]
```

## Technical Implementation

### Blob Shape Generation

Blobs are created using:
1. Calculate bounding box around artifact(s) with padding
2. Generate points around an ellipse with random irregularity
3. Connect points with smooth bezier curves (Catmull-Rom splines)

```typescript
const BLOB_PADDING = 60;      // Padding around artifacts
const BLOB_MIN_SIZE = 80;     // Minimum blob dimensions
const BLOB_IRREGULARITY = 0.3; // Shape variation (0-1)
const BLOB_POINTS = 8;        // Points defining the shape
```

### SVG Rendering

Blobs are rendered as SVG paths with:
- Pattern fill (or solid color if no pattern)
- Dashed stroke for dotted border effect

### Pattern Definitions

Patterns are defined as SVG `<pattern>` elements:

```svg
<!-- Triangle pattern (forest) -->
<pattern id="pattern-triangles" width="30" height="30">
  <rect fill="rgba(34, 139, 34, 0.15)"/>
  <polygon points="15,5 25,25 5,25" fill="rgba(34, 139, 34, 0.6)" opacity="0.3"/>
</pattern>
```

## Future Enhancements

- **Dynamic blob updates**: Regenerate when artifacts are collected
- **Animation**: Subtle pulsing or floating animation
- **Custom patterns**: User-defined background patterns
- **Biome system**: Larger themed regions with multiple blob types
- **Procedural patterns**: Generated patterns based on world position

## CSS Classes

```css
.at-design-layer    /* Container for all blobs */
.at-design-svg      /* SVG element containing blob paths */
.at-blob            /* Individual blob group */
.at-blob-fill       /* Blob fill path */
.at-blob-border     /* Blob border path */
.at-blob-{type}     /* Type-specific styling (e.g., .at-blob-paper) */
```

