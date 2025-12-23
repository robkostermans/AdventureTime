# Story Mode Feature

Story Mode provides a text-based game style interface for artifact interactions, replacing the default popover UI with a terminal-style text display at the bottom of the screen.

## Overview

Instead of showing a popup dialog when encountering artifacts, Story Mode presents the interaction as a narrative text adventure:

```
You have found a 🥇 gold coin containing:

    "Lorem ipsum dolor sit amet..."

Would you like to...

    ▶ Take it with you
      Leave it be
```

## Configuration

```typescript
interface StoryModeConfig {
  enabled: boolean;           // Whether story mode is enabled
  typewriterSpeed?: number;   // Characters per second for effects (default: 50)
}

// Example in AppConfig:
storyMode: {
  enabled: true,
  typewriterSpeed: 50,
}
```

## Visual Design

### Terminal Appearance

- Dark, semi-transparent background with green-tinted text
- Monospace font (Courier New)
- Scanline effect for retro terminal feel
- Subtle glow at the top edge
- Positioned at bottom center of screen

### Text Styling

- **Discovery text**: Light green, describes what was found
- **Content text**: Darker green, italic, indented with left border
- **Question text**: Gold/amber color for "Would you like to..."
- **Result text**: Bright green for action confirmation
- **Intro mode**: Warmer amber tones for welcome messages

### Animations

- Fade-in effect when terminal appears
- Staggered appearance of text lines (0.1s delay between lines)
- Options fade in after content (0.3-0.4s delay)
- Smooth slide-up transition on show/hide

## Interaction Flow

### Phases

1. **Discovery Phase** (800ms)

   - Shows "You have found a [icon] [type] containing:"
   - Displays the artifact's content
   - Options are visible but not yet interactive

2. **Choice Phase**

   - Options become interactive
   - Arrow indicator shows selected option
   - Keyboard navigation enabled (↑/↓ or W/S)

3. **Result Phase**
   - Shows outcome message (e.g., "The gold coin gleams as you pocket it.")
   - Brief delay before closing (600ms)
   - Terminal fades out (800ms)

### Keyboard Controls

**Multi-choice artifacts** (scrolls, coins, portals, diamonds):

| Key           | Action                                 |
| ------------- | -------------------------------------- |
| ↑ / W         | Select previous option                 |
| ↓ / S         | Select next option                     |
| Enter / Space | Confirm selection                      |
| Escape        | Leave/dismiss (selects "Leave" option) |

**Single-choice artifacts** (direction signs, intro):

| Key     | Action               |
| ------- | -------------------- |
| Any key | Confirm and continue |

### Mouse Controls

- Hover over options to select
- Click option to confirm immediately

## Artifact-Specific Behavior

### Regular Artifacts (Scroll, Diamond, Coins)

```
You have found a 📜 scroll containing:

    "The ancient text reads..."

Would you like to...

    ▶ Take it with you
      Leave it be
```

**Result messages:**

- Take: "You carefully roll up the scroll and place it in your bag."
- Leave: "You leave the scroll where it lies."

### Direction Signs (🪧) - Single Choice

```
You have found a 🪧 sign containing:

    "Chapter One: The Beginning"

Press any key to continue...
```

Direction signs are **single-choice artifacts** - they cannot be collected and only require acknowledgment. Any key press will dismiss the terminal and continue gameplay.

### Portals (🌀)

```
You have found a 🌀 portal containing:

    "exercitation ullamco"

Would you like to...

    ▶ Step through the portal
      Leave it be
```

### Intro Artifact (🎪) - Single Choice

```
You have arrived at a 🎪 welcome marker...

    "Welcome to AdventureTime"

    There lays before you a vast landscape of knowledge
    and treasures to find. Go on and explore!

Press any key to begin...
```

The intro artifact is also a **single-choice artifact** - it uses warmer styling and custom content from configuration, and any key press will dismiss it and start the adventure.

## Technical Implementation

### Files

- `src/features/storymode/storymode.ts` - Main feature logic
- `src/features/storymode/storymode.css` - Terminal styling
- `src/features/storymode/types.ts` - Type definitions
- `src/features/storymode/index.ts` - Exports

### Integration with Inventory

The inventory system checks if story mode is enabled before showing interactions:

```typescript
if (config.useStoryMode && isStoryModeEnabled()) {
  showArtifactStoryMode(collidingArtifact);
} else {
  showArtifactPopover(collidingArtifact);
}
```

### Callbacks

Story mode uses callbacks to communicate actions back to the inventory system:

```typescript
setStoryModeCallbacks(
  (artifactId) => {
    /* handle take */
  },
  (artifactId) => {
    /* handle leave */
  }
);
```

### State Management

```typescript
interface StoryState {
  isActive: boolean;
  currentArtifactId: string | null;
  selectedOptionIndex: number;
  phase: "discovery" | "choice" | "result" | "idle";
}
```

## CSS Variables

The terminal uses CSS custom properties for theming:

```css
.at-story-terminal {
  --story-bg: rgba(10, 10, 15, 0.95);
  --story-border: #2a3a2a;
  --story-text: #a0d0a0;
  --story-text-dim: #80b080;
  --story-accent: #d0c090;
  --story-highlight: #c0f0c0;
}
```

## Accessibility

- Keyboard navigation for all interactions
- Clear visual feedback for selected options
- Escape key always available to dismiss
- High contrast text on dark background
- Semantic HTML structure

## Future Enhancements

- Typewriter effect for text appearance
- Sound effects for terminal interactions
- Custom themes (amber, blue, etc.)
- History/log of past interactions
