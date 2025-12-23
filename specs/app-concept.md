# AdventureTime - App Concept

This document describes the core concept and game mechanics for AdventureTime, a browser-based top-down adventure game built entirely with DOM elements.

## Overview

AdventureTime is a top-down exploration game that runs directly in the browser, transforming any webpage into a traversable game world. The player controls an avatar that appears to walk through the page content, with the world scrolling beneath them.

## Core Concept

- **DOM-Based Game World**: The game uses existing webpage DOM elements as the environment
- **Top-Down Perspective**: Classic overhead view similar to retro adventure games
- **Browser Integration**: Runs as a bookmarklet, overlaying any webpage
- **Vanilla Implementation**: Pure TypeScript/JavaScript with no frameworks

## Version 1.0 - Prototype Goals

The first version focuses on flushing out core mechanics using basic geometric shapes:

- Simple rectangular/circular avatar
- Basic collision boundaries
- Movement system validation
- World scrolling mechanics

---

## Game Mechanics

### Viewport System

The game uses a fixed **400×400 pixel square viewport** centered on screen:

```
┌─────────────────────────────────────────────┐
│                                             │
│    ┌─────────────────────────────┐          │
│    │                             │          │
│    │      400×400 Viewport       │          │
│    │                             │          │
│    │          [Avatar]           │          │
│    │           Center            │          │
│    │                             │          │
│    └─────────────────────────────┘          │
│                                             │
└─────────────────────────────────────────────┘
```

### Avatar Positioning

- The avatar is **nominally centered** in the viewport
- Avatar does not move relative to the viewport (except for movement feedback)
- The world moves beneath the avatar to create the illusion of movement

### Avatar Movement Feedback

The avatar provides visual feedback during movement through **rotation** and **offset**:

#### Rotation

- Avatar rotates to face the direction of movement
- 0° = facing up, 90° = facing right, 180° = facing down, 270° = facing left
- Rotation interpolates smoothly toward the target angle
- Uses shortest-path rotation (handles 360°→0° wrap-around)
- Rotation persists after stopping (avatar keeps facing last direction)

#### Offset from Center

- While moving, avatar shifts slightly toward movement direction
- Creates a "leaning into movement" effect
- Maximum offset is configurable (default: 8 pixels)
- **Offset scales with velocity**: The avatar offset is proportional to current speed
- When decelerating, avatar smoothly returns to center **in sync with world deceleration**
- Uses the same velocity factor (0-1) as world movement for perfectly synchronized animations

#### Configuration

```typescript
avatar: {
  maxOffset: 32,          // Max pixels from center at full speed
  offsetSmoothing: 0.12,  // Interpolation factor (0-1, lower = smoother)
  rotationEnabled: true,  // Enable/disable rotation
}
```

#### Visual Behavior

```
Moving Right:                    Stopping:
    ┌─────────┐                     ┌─────────┐
    │    →    │ ← Avatar offset     │    →    │ ← Avatar returns
    │   ◉→    │   + rotated right   │    ◉    │   to center smoothly
    │         │                     │         │
    └─────────┘                     └─────────┘
```

The smoothing creates a natural feel where:

1. Avatar quickly responds to direction changes
2. Deceleration is gradual when stopping
3. Rotation and position feel connected to momentum

### Movement Controls

| Key | World Movement    | Perceived Avatar Direction |
| --- | ----------------- | -------------------------- |
| ↑   | World moves DOWN  | Avatar walks UP            |
| ↓   | World moves UP    | Avatar walks DOWN          |
| ←   | World moves RIGHT | Avatar walks LEFT          |
| →   | World moves LEFT  | Avatar walks RIGHT         |

**Inverted Direction Logic**: When the player presses an arrow key, the world moves in the **opposite direction**, creating the perception that the avatar is walking in the pressed direction.
**Diagonal Direction**: Allow for diagonal movement as well and support compensated speed when moving in angles.
**Speed**: Allow for speed control via a specific speed var.

### Smooth Movement with Acceleration

Movement uses a **velocity-based system** with acceleration and deceleration for a smooth, natural feel:

#### Velocity System

- Movement is driven by **velocity** rather than direct position changes
- Velocity smoothly interpolates toward target speed when keys are pressed
- Velocity smoothly decelerates toward zero when keys are released
- Uses linear interpolation (lerp) for smooth transitions

#### Configuration

```typescript
movement: {
  speed: 8,           // Maximum speed in pixels per frame
  acceleration: 0.15, // How quickly to reach max speed (0-1, higher = faster)
  deceleration: 0.12, // How quickly to slow down (0-1, higher = faster)
}
```

#### Movement Behavior

```
Starting Movement:          Stopping Movement:
    0 ──────→ maxSpeed          maxSpeed ──────→ 0
       accelerate                    decelerate
       (gradual)                     (gradual)
```

**Acceleration** (0.15 default): Controls how quickly the avatar reaches full speed. Higher values = snappier response, lower values = more gradual buildup.

**Deceleration** (0.12 default): Controls how quickly the avatar comes to a stop. Lower values create a "gliding" effect where the avatar continues moving briefly after releasing keys.

#### Technical Implementation

```typescript
// Each frame:
if (hasInput) {
  // Accelerate toward target velocity
  velocity = lerp(velocity, targetVelocity, acceleration);
} else {
  // Decelerate toward zero
  velocity = lerp(velocity, 0, deceleration);
}

// Apply velocity to world movement
worldPosition += velocity;
```

The velocity threshold (0.01) determines when movement is considered "stopped" to avoid infinite micro-movements.

### Movement Implementation

```
Player Input: Arrow Key →
    ↓
Calculate Target Direction
    ↓
Apply Acceleration/Deceleration to Velocity
    ↓
Invert Velocity Direction
    ↓
Translate World Container
    ↓
Avatar appears to move through world
```

---

## World System

### Webpage Integration

The game transforms an existing webpage into a traversable world:

1. **Capture**: The current webpage content becomes the game world
2. **Extend**: Borders are extended to allow full exploration
3. **Overlay**: The viewport and avatar are layered on top

**Testing/development** for testing purpose create a basic html page with some random lorem ipsum texts, headers, links (empty #) and a some image placeholder

### World Boundaries

The world extends beyond the original page dimensions to accommodate the viewport:

```
┌─────────────────────────────────────────────────────────┐
│                    Extended Border                       │
│    ┌───────────────────────────────────────────────┐    │
│    │                                               │    │
│    │              Original Webpage                 │    │
│    │                 Content                       │    │
│    │                                               │    │
│    │                                               │    │
│    └───────────────────────────────────────────────┘    │
│                    Extended Border                       │
└─────────────────────────────────────────────────────────┘
```

### Border Extension Calculation

The extended border width equals the remaining space from viewport to screen edge:

```
Extended Border Width = (Screen Width - Viewport Width) / 2
Extended Border Height = (Screen Height - Viewport Height) / 2
```

This ensures the avatar can reach all corners of the original webpage content.

### World Layers

```
Layer 3 (Top):     Avatar (fixed center)
Layer 2:           Viewport Frame/Mask
Layer 1:           World Container (moves)
Layer 0 (Bottom):  Extended Background
```

---

## Technical Architecture

### Key Components

| Component       | Responsibility                             |
| --------------- | ------------------------------------------ |
| Viewport        | 400×400 masked viewing area                |
| Avatar          | Centered player representation             |
| World Container | Holds webpage content, receives transforms |
| Input Handler   | Captures arrow keys, inverts direction     |
| Movement Engine | Applies translations to world container    |

### CSS Transform Approach

```css
.world-container {
  transform: translate(offsetX, offsetY);
  transition: transform 0.1s ease-out; /* Optional smoothing */
}
```

### Viewport Masking

```css
.viewport {
  width: 400px;
  height: 400px;
  overflow: hidden;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

---

## Future Considerations

These features are **not** in scope for v1.0 but inform architectural decisions:

- Collision detection with DOM elements
- Interactive objects and NPCs
- Inventory system
- Multiple "levels" (different webpages)
- Save/load game state
- Sprite-based avatar with animations
- Sound effects and music
