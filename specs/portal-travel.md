# Portal Travel & Persistence

This document describes the portal travel system and game state persistence for AdventureTime.

## Overview

The portal travel system allows players to navigate between different pages within the same domain while maintaining their inventory and remembering artifact positions. This creates a persistent exploration experience across multiple pages.

## Portal Travel Flow

### Outbound Travel (Leaving a Page)

When a player chooses to "step through" a portal:

1. **Fade to Black**: The viewport fades to black over 500ms
2. **Save State**: Current page state is saved to localStorage
3. **Set Previous Page**: The current URL is stored as the "previous page" for travel-back functionality
4. **Navigate**: Browser navigates to the portal's destination URL

```
┌─────────────────┐
│  Portal Found   │
│  "Step through" │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Fade to Black  │
│    (500ms)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Save State &   │
│  Navigate       │
└─────────────────┘
```

### Inbound Travel (Arriving at a Page)

When arriving at a page via portal travel:

1. **Detect Arrival**: Check if `previousPageUrl` is set in persistence
2. **Load State**: Restore artifact positions and inventory from localStorage
3. **Fade from Black**: Viewport fades in from black
4. **Show Arrival Message**: Story mode displays welcome message with option to travel back

```
┌─────────────────┐
│  Page Loads     │
│  (via portal)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Load Saved     │
│  Positions      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Fade from      │
│  Black (500ms)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Arrival Story  │
│  Mode Message   │
└─────────────────┘
```

## Arrival Story Mode

When arriving at a new region via portal, a special story mode message appears:

```
You have traveled to the 🌍
"[Page Title]"

Before you lay yet more knowledge and artifacts to collect.

▶ Begin exploring
  Travel back
```

The "Travel back" option initiates portal travel back to the previous page.

## Persistence System

### Storage Keys

All game state is stored under a single localStorage key with configurable prefix:

```
{prefix}_gameState (default: "at_gameState")
```

### Stored Data Structure

```typescript
interface StoredGameState {
  inventory: StoredInventoryItem[];
  pages: Record<string, StoredPageState>;
  travelHistory: TravelHistoryEntry[];
  currentPageUrl: string;
  previousPageUrl?: string;  // Set when arriving via portal
}

interface StoredInventoryItem {
  id: string;
  type: ArtifactType;
  content: string;
  href?: string;
  collectedAt: number;
  collectedFromUrl: string;
}

interface StoredPageState {
  url: string;
  artifacts: StoredArtifactPosition[];
  lastVisited: number;
}

interface StoredArtifactPosition {
  id: string;
  type: ArtifactType;
  position: { x: number; y: number };
  collected: boolean;
}
```

### Artifact Position Persistence

Artifact positions are persisted per-page using a deterministic ID based on:
- Element tag name
- Artifact type
- Content hash (first 50 characters of text content)

This ensures the same artifact gets the same ID across page visits, allowing positions to be restored correctly.

### Collected Artifacts

When an artifact is collected:
1. It's marked as `collected: true` in the page state
2. The item is added to the inventory storage
3. On subsequent visits, a ghost marker is created instead of the artifact

### Inventory Persistence

Inventory items persist across:
- Page navigation
- Browser refresh
- Portal travel between pages

Items include their original content and href (for portals), allowing them to be displayed correctly in the inventory UI.

## Same-Origin Restriction

Portal travel with fade transitions only works for same-origin links:
- Same domain
- Same protocol (http/https)
- Same port

External links open directly without the fade transition or persistence features.

## Configuration

Portal travel is automatically enabled when both the travel and persistence features are initialized. No additional configuration is required.

```typescript
// These are initialized automatically in initFeatures()
initPersistence({ enabled: true, debug: false });
initTravel({ enabled: true, debug: false });
```

## Technical Implementation

### Modules

| Module | Purpose |
|--------|---------|
| `features/persistence/` | localStorage read/write operations |
| `features/travel/` | Portal travel logic and fade coordination |
| `features/viewport/` | Fade overlay and transitions |
| `features/storymode/` | Arrival message display |

### Key Functions

```typescript
// Travel module
travelToDestination(destination: TravelDestination): Promise<void>
travelBack(): Promise<void>
isSameOrigin(url: string): boolean

// Persistence module
getGameState(): StoredGameState
saveGameState(state: StoredGameState): void
getArtifactPositions(): StoredArtifactPosition[] | null
saveArtifactPositions(artifacts: StoredArtifactPosition[]): void
hasArrivedViaPortal(): boolean
clearArrivalFlag(): void

// Viewport module
fadeToBlack(): Promise<void>
fadeFromBlack(): Promise<void>
```

## Visual Design

### Fade Overlay

The fade overlay is a full-viewport black element that animates opacity:

```css
.at-fade-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  opacity: 0;
  pointer-events: none;
  z-index: 200;
  transition: opacity 0.5s ease-in-out;
}

.at-fade-overlay--active {
  opacity: 1;
  pointer-events: auto;
}
```

## Future Considerations

- **Cross-origin messaging**: Could enable travel between different domains with consent
- **Travel history UI**: Display a visual timeline of visited pages
- **Bookmark system**: Allow players to save and return to specific locations
- **Multiplayer sync**: Share inventory/progress between devices

