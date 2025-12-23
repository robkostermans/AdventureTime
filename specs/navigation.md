# Navigation Indicator Specification

This document describes the Navigation Indicator feature, which provides a visual compass pointing to the nearest direction artifact (🪧).

## Overview

The Navigation Indicator is a small glowing dot that orbits around the avatar at a configurable distance. It always points toward the nearest direction artifact, helping players find their way through the page. By default, it only appears while moving and fades out when standing still.

## Visual Design

```
        ● ← Navigation indicator (gold dot)
        |
        | (indicatorDistance = 100px)
        |
        ●─────● ← Avatar (green circle)
```

### Appearance
- **Shape**: Small circular dot
- **Color**: Gold (#FFD700) by default with glow effect
- **Size**: 8px by default
- **Position**: Fixed distance from avatar center, rotating to point at target

### States
1. **Visible**: Shows when moving (or when still, if `showWhenStill: true`) AND no direction artifact is in viewport
2. **Hidden**: Fades out when:
   - Standing still (or when moving, if `showWhenStill: true`)
   - Any direction artifact is visible in the viewport (no need for hint)
   - No direction artifacts exist
3. **Near** (< 100px from target): Pulsing animation to indicate proximity

## Configuration

```typescript
navigation: {
  enabled: true,                    // Enable/disable the feature
  indicatorDistance: 100,           // Distance from avatar center (pixels)
  showWhenStill: false,             // false = show when moving (default)
                                    // true = show when standing still
  // Optional visual overrides:
  // indicatorSize: 8,              // Dot size (pixels)
  // indicatorColor: "#FFD700",     // Dot color
}
```

### Config Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `enabled` | boolean | Yes | - | Enable/disable navigation indicator |
| `indicatorDistance` | number | Yes | - | Distance from avatar center in pixels |
| `showWhenStill` | boolean | No | false | If false, show when moving. If true, show when standing still |
| `indicatorSize` | number | No | 8 | Size of the indicator dot in pixels |
| `indicatorColor` | string | No | #FFD700 | Color of the indicator (CSS color) |

## Behavior

### Target Selection
- Scans all artifacts for type `"direction"` (🪧)
- Calculates distance from avatar (screen center) to each direction artifact
- Selects the nearest one as the target

### Position Calculation
1. Get screen center (avatar position)
2. Get target artifact's screen position
3. Calculate direction vector from avatar to target
4. Normalize the direction
5. Position indicator at `indicatorDistance` pixels along that direction

### Animation
- **Near state** (< 100px): Triggers pulse animation
  - Scale oscillates between 1.0 and 1.3
  - Glow intensifies

## CSS Styling

Visual defaults are defined in `src/features/navigation/navigation.css`:

```css
.at-navigation-indicator {
  width: var(--at-nav-indicator-size, 8px);
  height: var(--at-nav-indicator-size, 8px);
  background: var(--at-nav-indicator-color, #FFD700);
  border-radius: 50%;
  box-shadow: 
    0 0 4px var(--at-nav-indicator-color, #FFD700),
    0 0 8px rgba(255, 215, 0, 0.5);
}
```

## File Structure

```
src/features/navigation/
├── index.ts           # Public exports
├── navigation.ts      # Main implementation
├── navigation.css     # Styles
└── types.ts           # Type definitions
```

## Dependencies

- Requires **Interaction Layer** to be enabled (needs `getArtifacts()` function)
- Must be initialized after interaction layer

## Usage Example

```typescript
// In main.ts config
const config: AppConfig = {
  // ... other config
  interaction: {
    enabled: true,  // Required for navigation
  },
  navigation: {
    enabled: true,
    indicatorDistance: 50,
  },
};
```

## Future Enhancements

Potential improvements for future versions:
- Multiple indicators for nearby direction artifacts
- Trail effect showing recent path
- Distance display text
- Customizable near threshold
- Arrow shape instead of dot

