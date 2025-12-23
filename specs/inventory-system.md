# Inventory System Specification

This document describes the Inventory System feature, which allows players to collect artifacts through collision detection and manage them in an inventory bag.

## Overview

The Inventory System provides:
- **Collision Detection**: Avatar colliding with artifacts triggers interaction
- **Artifact Popover**: Shows original content and action options
- **Inventory Bag**: Visual bag icon with item counter
- **Inventory Dialog**: Accordion-style list of collected items

---

## Collision Detection

### How It Works

The system continuously checks for collisions between the avatar (always at screen center) and artifact icons.

```
┌─────────────────────────────┐
│                             │
│         Avatar (center)     │
│            ●────┐           │
│               collision     │
│            🌀 ←─┘ radius    │
│                             │
└─────────────────────────────┘
```

### Detection Algorithm

```typescript
// Avatar is always at screen center
const screenCenterX = window.innerWidth / 2;
const screenCenterY = window.innerHeight / 2;

// Collision radius = avatar radius + config radius
const collisionRadius = avatarSize / 2 + config.collisionRadius;

// For each artifact, check distance
const distance = sqrt(dx² + dy²);
if (distance < collisionRadius + artifactRadius) {
  // Collision detected!
}
```

### Configuration

```typescript
inventory: {
  enabled: true,
  collisionRadius: 10  // Extra pixels around avatar
}
```

---

## Artifact Popover

When the avatar collides with an artifact, a popover appears showing:

```
┌─────────────────────────────────┐
│ 🌀 Portal                    ✕ │
├─────────────────────────────────┤
│                                 │
│  [Original element content]    │
│                                 │
│  → https://example.com/link    │
│                                 │
├─────────────────────────────────┤
│  [ Travel ]    [ Leave ]       │
└─────────────────────────────────┘
```

### Actions

| Artifact Type | Primary Action | Behavior |
|--------------|----------------|----------|
| Portal | Travel | Opens link (future feature) |
| Paper | Take | Collects to inventory |
| Direction | — | No action, view only (Leave button only) |
| Diamond | Take | Collects to inventory |
| Silver | Take | Collects to inventory |
| Gold | Take | Collects to inventory |

### Popover Controls

- **Close (✕)**: Dismisses popover without action
- **Leave**: Dismisses popover, artifact remains
- **Take/Travel**: Performs action (collect or travel)
- **Escape key**: Dismisses popover

### Ghost Markers

When an artifact is collected, a faint star (⭐) is left behind at its original position. This allows players to:
- Remember where they found items
- Navigate back to interesting locations
- Track their exploration progress
- Review the original content of collected items

```
Before collection:     After collection:
     📜                     ⭐
  (Paper artifact)     (Ghost marker)
```

Ghost markers are:
- **Interactive** - Colliding with a ghost marker shows a "Memory" popover
- Semi-transparent (30% opacity)
- Slightly desaturated
- Permanent (remain until page reload)

#### Ghost Marker Popover

When the avatar collides with a ghost marker, a special popover appears:

```
┌─────────────────────────────────┐
│ ⭐ Memory of Paper           ✕ │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │ 📜 You collected this   │   │
│  │    item here            │   │
│  └─────────────────────────┘   │
│                                 │
│  [Original element content]    │
│                                 │
├─────────────────────────────────┤
│        [ Continue ]             │
└─────────────────────────────────┘
```

- Shows the original artifact type and content
- Only has a "Continue" button (no "Take" action)
- Helps players remember what they collected at each location

---

## Inventory Bag

A bag icon in the lower-right corner of the viewport.

```
                    ┌──────┐
                    │  🎒  │
                    │  (3) │ ← Counter bubble
                    └──────┘
```

### Features

- **Position**: Fixed bottom-right (20px from edges)
- **Counter**: Shows number of collected items
- **Counter visibility**: Hidden when empty, visible when items > 0
- **Click**: Opens inventory dialog
- **Keyboard**: Ctrl+I / Cmd+I toggles inventory

### Styling

```css
.at-inventory-bag {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  background: linear-gradient(145deg, #8B4513, #654321);
  border-radius: 50%;
  z-index: 1000001;
}
```

---

## Inventory Dialog

A modal dialog showing all collected items.

```
┌─────────────────────────────────────┐
│ 🎒 Inventory              3 items ✕ │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📜 Scroll                     ▶ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🥇 Gold Coin                  ▼ │ │
│ ├─────────────────────────────────┤ │
│ │  [Original content preview]    │ │
│ │                                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💎 Gem                        ▶ │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

### Accordion Behavior

- Click item header to expand/collapse
- Only one item expanded at a time
- Expanded item shows original HTML content
- Portals show the URL they link to

### Dialog Controls

- **Close (✕)**: Closes dialog
- **Escape key**: Closes dialog
- **Ctrl+I / Cmd+I**: Toggles dialog

---

## Data Structures

### Inventory Item

```typescript
interface InventoryItem {
  id: string;              // Unique identifier
  artifact: Artifact;      // Reference to original artifact
  collectedAt: number;     // Timestamp of collection
  originalContent: string; // HTML content of source element
  originalHref?: string;   // For portals, the link URL
}
```

### Inventory State

```typescript
interface InventoryState {
  items: InventoryItem[];      // Collected items
  isOpen: boolean;             // Dialog open state
  expandedItemId: string | null; // Currently expanded item
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+I / Cmd+I | Toggle inventory dialog |
| Escape | Close popover or dialog |
| Tab | Navigate to next button in popover |
| Shift+Tab | Navigate to previous button in popover |
| Arrow Left/Right | Navigate between popover buttons |
| Enter | Activate focused button |

### Popover Focus Management

When an artifact popover appears:
1. **Take/Travel button is auto-focused** - Pressing Enter immediately collects/travels
2. **Focus is trapped** - Tab cycles only through popover buttons (Take, Leave, Close)
3. **Arrow keys work** - Left/Right arrows navigate between buttons
4. **Visual focus indicators** - Focused buttons have a visible ring outline
5. **Movement is paused** - WASD/Arrow keys are disabled while popover is open

### Popover Dismissal

The artifact popover is automatically closed when:
- User clicks "Take" or "Leave" button
- User presses Escape
- User clicks the Close (✕) button
- User opens the inventory bag (clicking bag icon or Ctrl+I)

### Collision Cooldown

To prevent the popover from immediately re-appearing after dismissal (which would trap the player), a cooldown mechanism is implemented:

1. **Time-based cooldown**: After dismissing a popover (Leave, Escape, Close), collision detection is paused for 500ms
2. **Artifact tracking**: The dismissed artifact's ID is tracked, and collision with the same artifact is ignored until the player moves away
3. **Automatic reset**: Once the player moves away from the artifact (no collision detected), the tracking is cleared

This allows the player to:
- Dismiss the popover and move away without getting trapped
- Return to the same artifact later to interact with it again

---

## Integration Flow

```
1. Avatar moves through world
2. Collision detection runs every frame
3. When collision detected:
   a. Show artifact popover
   b. Pause collision detection
4. User chooses action:
   - Take: Add to inventory, remove from world
   - Leave: Close popover, resume detection
   - Travel (portals): Future feature
5. Update bag counter
6. Resume collision detection
```

---

## Future Considerations

These features are planned but not yet implemented:

- **Travel Feature**: Actually navigate to portal links
- **Item Removal**: Ability to discard items from inventory
- **Item Usage**: Use collected items for game mechanics
- **Persistence**: Save inventory across sessions
- **Item Categories**: Filter/sort inventory by type
- **Item Details**: More detailed item information view
- **Sound Effects**: Audio feedback for collection
- **Visual Effects**: Animation when collecting items

