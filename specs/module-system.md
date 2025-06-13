# Module System Specification

This document defines how features are organized, imported, and structured in the AdventureTime project.

## Module Architecture

### ES Module System

- Use ES6 import/export syntax
- TypeScript module resolution
- Tree-shaking friendly exports
- Clean import paths via index files

### Module Hierarchy

```
src/
├── main.ts           # Root module - IIFE wrapper
├── core/             # Core functionality
├── features/         # Feature modules
└── styles/           # Style modules
```

## Core Module System

### `src/core/index.ts`

```typescript
// Clean exports from core module
export { App } from "./app";
export { Utils } from "./utils";
export * from "./types";
```

### `src/core/app.ts`

```typescript
import { initFeatures, destroyFeatures } from "../features";
import type { AppConfig } from "./types";

let isInitialized = false;
let cleanupFunctions: (() => void)[] = [];

export async function initApp(config: AppConfig): Promise<void> {
  if (isInitialized) {
    console.warn("App already initialized");
    return;
  }

  try {
    // Initialize features
    const featureCleanup = await initFeatures(config);
    cleanupFunctions.push(featureCleanup);

    isInitialized = true;

    if (config.debug) {
      console.log("AdventureTime initialized");
    }
  } catch (error) {
    console.error("App initialization failed:", error);
    throw error;
  }
}

export async function destroyApp(): Promise<void> {
  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
  isInitialized = false;
}
```

## Feature Module System

### Feature Structure

Each feature follows this pattern:

```
features/
├── feature-name/
│   ├── index.ts           # Public API exports
│   ├── feature-name.ts    # Main implementation
│   ├── types.ts           # Feature-specific types
│   └── utils.ts           # Feature utilities (optional)
```

### `src/features/index.ts`

```typescript
// Feature aggregation
export { initFeatureA, destroyFeatureA } from "./feature-a";
export { initFeatureB, destroyFeatureB } from "./feature-b";
import type { AppConfig } from "../core/types";

// Feature management functions
export async function initFeatures(config: AppConfig): Promise<() => void> {
  const cleanupFunctions: (() => void)[] = [];

  try {
    // Initialize features based on config
    if (config.features.featureA) {
      await initFeatureA({ enabled: true, debug: config.debug });
      cleanupFunctions.push(destroyFeatureA);
    }

    if (config.features.featureB) {
      await initFeatureB({ enabled: true, debug: config.debug });
      cleanupFunctions.push(destroyFeatureB);
    }

    // Return cleanup function
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  } catch (error) {
    // Cleanup any partially initialized features
    cleanupFunctions.forEach((cleanup) => cleanup());
    throw error;
  }
}
```

### Individual Feature Pattern

#### `src/features/feature-a/index.ts`

```typescript
export { initFeatureA, destroyFeatureA, executeFeatureA } from "./feature-a";
export type { FeatureAConfig } from "./types";
```

#### `src/features/feature-a/feature-a.ts`

```typescript
import type { FeatureAConfig } from "./types";

let isInitialized = false;
let config: FeatureAConfig;
let cleanupFunctions: (() => void)[] = [];

export async function initFeatureA(
  featureConfig: FeatureAConfig
): Promise<void> {
  if (isInitialized) {
    console.warn("FeatureA already initialized");
    return;
  }

  config = { enabled: true, debug: false, ...featureConfig };

  if (!config.enabled) {
    return;
  }

  try {
    // Feature initialization logic
    setupEventListeners();
    isInitialized = true;

    if (config.debug) {
      console.log("FeatureA initialized");
    }
  } catch (error) {
    console.error("FeatureA initialization failed:", error);
    throw error;
  }
}

export function destroyFeatureA(): void {
  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
  isInitialized = false;
}

export function executeFeatureA(): void {
  if (!isInitialized) {
    throw new Error("FeatureA not initialized");
  }
  // Feature execution logic
  console.log("FeatureA executing...");
}

function setupEventListeners(): void {
  const handleClick = (event: Event) => {
    console.log("FeatureA handling click:", event);
  };

  document.addEventListener("click", handleClick);
  cleanupFunctions.push(() => {
    document.removeEventListener("click", handleClick);
  });
}
```

## Style Module System

### CSS Modules Pattern

```css
/* src/styles/base.module.css */
.container {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 999999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.hidden {
  display: none !important;
}
```

```css
/* src/styles/components.module.css */
.button {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.button:hover {
  background: #0056b3;
}
```

### Using CSS Modules in TypeScript

```typescript
// Import CSS modules
import styles from "./styles/base.module.css";
import componentStyles from "./styles/components.module.css";

// Use scoped class names
const element = document.createElement("div");
element.className = styles.container;

const button = document.createElement("button");
button.className = componentStyles.button;
```

## Import Conventions

### Absolute Imports (from src root)

```typescript
// Main entry point imports
import { initApp } from "./core";
import { initFeatureA, initFeatureB } from "./features";
```

### Relative Imports (within modules)

```typescript
// Within feature modules
import type { FeatureAConfig } from "./types";
import { helperFunction } from "./utils";
```

### Type-Only Imports

```typescript
// Import only types
import type { AppConfig } from "./core/types";
import type { FeatureAConfig } from "./features/feature-a/types";
```

## Module Registration Pattern

### Feature Registration

```typescript
// In main.ts
import { initApp } from "./core";

await initApp({
  debug: false,
  features: {
    featureA: true,
    featureB: false,
  },
  ui: {
    theme: "default",
    position: "top-right",
  },
});
```

## Tree Shaking Optimization

### Export Patterns for Tree Shaking

```typescript
// Good - Named function exports
export { initFeatureA, destroyFeatureA } from "./feature-a";
export { initFeatureB, destroyFeatureB } from "./feature-b";

// Avoid - Default exports with objects
export default {
  initFeatureA,
  initFeatureB,
};
```

### Simple Feature Initialization

```typescript
// Direct feature initialization
if (config.features.featureA) {
  await initFeatureA({ enabled: true });
}
```

## Module Boundaries

### Core Module Responsibilities

- Application lifecycle management
- Shared utilities and types
- Configuration management

### Feature Module Responsibilities

- Self-contained functionality
- Own state management
- Clean public API

### Style Module Responsibilities

- CSS modules for scoped styling
- Component-specific styles
- Theme variables and design tokens
