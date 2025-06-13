# Feature Architecture Specification

This document defines how individual features are structured, implemented, and integrated in the AdventureTime project.

## Feature Structure Pattern

### Standard Feature Directory

```
src/features/feature-name/
├── index.ts           # Public API exports
├── feature-name.ts    # Main feature implementation
├── types.ts           # Feature-specific types
├── utils.ts           # Feature utilities (optional)
└── styles.ts          # Feature styles (optional)
```

## Feature Implementation Pattern

### Base Feature Types

```typescript
// src/core/types.ts
export interface FeatureConfig {
  enabled: boolean;
  debug?: boolean;
}

export type FeatureInitFunction = (
  config: FeatureConfig
) => Promise<void> | void;
export type FeatureDestroyFunction = () => Promise<void> | void;
export type FeatureExecuteFunction = () => void;
```

### Feature Implementation Template

```typescript
// src/features/example-feature/example-feature.ts
import type { ExampleFeatureConfig } from "./types";

let isInitialized = false;
let config: ExampleFeatureConfig;
let cleanupFunctions: (() => void)[] = [];

export async function initExampleFeature(
  featureConfig: ExampleFeatureConfig
): Promise<void> {
  if (isInitialized) {
    console.warn("ExampleFeature already initialized");
    return;
  }

  config = { enabled: true, debug: false, ...featureConfig };

  if (!config.enabled) {
    return;
  }

  try {
    await setupFeature();
    attachEventListeners();
    isInitialized = true;

    if (config.debug) {
      console.log("ExampleFeature initialized");
    }
  } catch (error) {
    console.error("ExampleFeature initialization failed:", error);
    throw error;
  }
}

export function destroyExampleFeature(): void {
  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
  isInitialized = false;
}

export function executeExampleFeature(): void {
  if (!isInitialized) {
    throw new Error("ExampleFeature not initialized");
  }
  // Feature execution logic
  console.log("ExampleFeature executing...");
}

async function setupFeature(): Promise<void> {
  // Feature-specific setup logic
}

function attachEventListeners(): void {
  // Event listener setup with cleanup tracking
  const handleClick = (event: Event) => {
    console.log("ExampleFeature handling click:", event);
  };

  document.addEventListener("click", handleClick);
  cleanupFunctions.push(() => {
    document.removeEventListener("click", handleClick);
  });
}
```

## Feature Types Definition

### Feature-Specific Types

```typescript
// src/features/example-feature/types.ts
import type { FeatureConfig } from "../../core/types";

export interface ExampleFeatureConfig extends FeatureConfig {
  threshold?: number;
  autoStart?: boolean;
  customOptions?: {
    color: string;
    size: number;
  };
}

export interface ExampleFeatureEvents {
  onActivate?: () => void;
  onDeactivate?: () => void;
  onUpdate?: (data: any) => void;
}
```

## Feature Export Pattern

### Clean Public API

```typescript
// src/features/example-feature/index.ts
export {
  initExampleFeature,
  destroyExampleFeature,
  executeExampleFeature,
} from "./example-feature";
export type { ExampleFeatureConfig, ExampleFeatureEvents } from "./types";

// Optional: Export utilities if needed by other features
export { exampleUtils } from "./utils";
```

## Feature Management

### Simple Feature Initialization

```typescript
// src/features/index.ts
import { initFeatureA, destroyFeatureA } from "./feature-a";
import { initFeatureB, destroyFeatureB } from "./feature-b";
import type { AppConfig } from "../core/types";

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

## Feature Communication

### Simple Event System

```typescript
// Simple custom events for feature communication
function emitFeatureEvent(eventName: string, data?: any): void {
  const event = new CustomEvent(`adventure-time:${eventName}`, {
    detail: data,
  });
  document.dispatchEvent(event);
}

function listenToFeatureEvent(
  eventName: string,
  callback: (data: any) => void
): () => void {
  const handler = (event: CustomEvent) => {
    callback(event.detail);
  };

  document.addEventListener(`adventure-time:${eventName}`, handler);

  // Return cleanup function
  return () => {
    document.removeEventListener(`adventure-time:${eventName}`, handler);
  };
}
```

### Feature-to-Feature Communication

```typescript
// In feature implementation
export async function initExampleFeature(
  config: ExampleFeatureConfig
): Promise<void> {
  // Listen to other features
  const cleanup = listenToFeatureEvent("other-feature:update", (data) => {
    handleOtherFeatureUpdate(data);
  });

  cleanupFunctions.push(cleanup);

  // Emit events for other features
  emitFeatureEvent("example-feature:ready", {
    feature: "ExampleFeature",
    version: "1.0.0",
  });
}
```

## Feature Utilities Pattern

### Shared Utilities

```typescript
// src/features/example-feature/utils.ts
export const exampleUtils = {
  formatData(data: any[]): string {
    return data.map((item) => item.toString()).join(", ");
  },

  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  createElement(
    tag: string,
    attributes: Record<string, string> = {}
  ): HTMLElement {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  },
};
```

## Feature Styling

### CSS Modules for Features

```css
/* src/features/example-feature/example-feature.module.css */
.container {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 999999;
}

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

```typescript
// Using CSS modules in feature
import styles from "./example-feature.module.css";

function createFeatureElement(): HTMLElement {
  const container = document.createElement("div");
  container.className = styles.container;

  const button = document.createElement("button");
  button.className = styles.button;
  button.textContent = "Click me";

  container.appendChild(button);
  return container;
}
```

## Feature Testing Pattern

### Feature Test Structure

```typescript
// src/features/example-feature/__tests__/example-feature.test.ts
import { initExampleFeature, destroyExampleFeature } from "../example-feature";
import type { ExampleFeatureConfig } from "../types";

describe("ExampleFeature", () => {
  let config: ExampleFeatureConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      debug: false,
    };
  });

  afterEach(() => {
    destroyExampleFeature();
  });

  test("should initialize correctly", async () => {
    await initExampleFeature(config);
    // Test feature functionality
  });

  test("should handle disabled state", async () => {
    await initExampleFeature({ enabled: false });
    // Test that feature doesn't activate when disabled
  });
});
```

## Feature Documentation

### Feature README Template

````markdown
# ExampleFeature

Brief description of what this feature does.

## Configuration

```typescript
interface ExampleFeatureConfig {
  enabled: boolean;
  threshold?: number;
  autoStart?: boolean;
}
```
````

## Usage

```typescript
import { initExampleFeature } from "./features/example-feature";

await initExampleFeature({
  enabled: true,
  threshold: 100,
});
```

## Events

- `example-feature:ready` - Emitted when feature is initialized
- `example-feature:update` - Emitted when feature data updates

## Dependencies

- None (self-contained)

```

```
