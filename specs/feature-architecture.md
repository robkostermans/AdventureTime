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

### Base Feature Interface

```typescript
// src/core/types.ts
export interface BaseFeature {
  readonly name: string;
  readonly version: string;
  init(): Promise<void> | void;
  destroy(): Promise<void> | void;
  isEnabled(): boolean;
}

export interface FeatureConfig {
  enabled: boolean;
  debug?: boolean;
}
```

### Feature Implementation Template

```typescript
// src/features/example-feature/example-feature.ts
import type { BaseFeature, FeatureConfig } from "../../core/types";
import type { ExampleFeatureConfig, ExampleFeatureState } from "./types";

export class ExampleFeature implements BaseFeature {
  public readonly name = "ExampleFeature";
  public readonly version = "1.0.0";

  private config: ExampleFeatureConfig;
  private state: ExampleFeatureState;
  private cleanupFunctions: (() => void)[] = [];

  constructor(config: ExampleFeatureConfig) {
    this.config = { enabled: true, ...config };
    this.state = {
      initialized: false,
      active: false,
    };
  }

  public async init(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      await this.setupFeature();
      this.attachEventListeners();
      this.state.initialized = true;

      if (this.config.debug) {
        console.log(`${this.name} initialized`);
      }
    } catch (error) {
      console.error(`${this.name} initialization failed:`, error);
      throw error;
    }
  }

  public async destroy(): Promise<void> {
    // Run cleanup functions
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];

    this.state.initialized = false;
    this.state.active = false;
  }

  public isEnabled(): boolean {
    return this.config.enabled && this.state.initialized;
  }

  private async setupFeature(): Promise<void> {
    // Feature-specific setup logic
  }

  private attachEventListeners(): void {
    // Event listener setup with cleanup tracking
    const handleClick = (event: Event) => {
      // Handle click
    };

    document.addEventListener("click", handleClick);
    this.cleanupFunctions.push(() => {
      document.removeEventListener("click", handleClick);
    });
  }
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

export interface ExampleFeatureState {
  initialized: boolean;
  active: boolean;
  lastUpdate?: Date;
  data?: any[];
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
export { ExampleFeature } from "./example-feature";
export type {
  ExampleFeatureConfig,
  ExampleFeatureState,
  ExampleFeatureEvents,
} from "./types";

// Optional: Export utilities if needed by other features
export { exampleUtils } from "./utils";
```

## Feature Registration System

### Feature Manager

```typescript
// src/features/index.ts
import type { BaseFeature } from "../core/types";

export class FeatureManager {
  private features = new Map<string, BaseFeature>();
  private initializationOrder: string[] = [];

  public register(feature: BaseFeature, priority = 0): void {
    this.features.set(feature.name, feature);

    // Insert based on priority (higher priority first)
    const insertIndex = this.initializationOrder.findIndex((name) => {
      const existingFeature = this.features.get(name);
      return existingFeature && this.getPriority(existingFeature) < priority;
    });

    if (insertIndex === -1) {
      this.initializationOrder.push(feature.name);
    } else {
      this.initializationOrder.splice(insertIndex, 0, feature.name);
    }
  }

  public async initializeAll(): Promise<void> {
    for (const featureName of this.initializationOrder) {
      const feature = this.features.get(featureName);
      if (feature && feature.isEnabled()) {
        try {
          await feature.init();
        } catch (error) {
          console.error(`Failed to initialize ${featureName}:`, error);
        }
      }
    }
  }

  public async destroyAll(): Promise<void> {
    // Destroy in reverse order
    const reverseOrder = [...this.initializationOrder].reverse();

    for (const featureName of reverseOrder) {
      const feature = this.features.get(featureName);
      if (feature) {
        try {
          await feature.destroy();
        } catch (error) {
          console.error(`Failed to destroy ${featureName}:`, error);
        }
      }
    }
  }

  private getPriority(feature: BaseFeature): number {
    // Default priority logic
    return 0;
  }
}
```

## Feature Communication

### Event System

```typescript
// src/core/events.ts
export class EventBus {
  private listeners = new Map<string, Set<Function>>();

  public on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  public emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Event callback error for ${event}:`, error);
        }
      });
    }
  }
}
```

### Feature-to-Feature Communication

```typescript
// In feature implementation
export class ExampleFeature implements BaseFeature {
  constructor(config: ExampleFeatureConfig, private eventBus: EventBus) {
    // ...
  }

  public init(): void {
    // Listen to other features
    this.eventBus.on("other-feature:update", (data) => {
      this.handleOtherFeatureUpdate(data);
    });

    // Emit events for other features
    this.eventBus.emit("example-feature:ready", {
      feature: this.name,
      version: this.version,
    });
  }
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

### CSS-in-JS for Features

```typescript
// src/features/example-feature/styles.ts
export const exampleFeatureStyles = `
  .example-feature {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 999999;
  }

  .example-feature__button {
    background: #007bff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }

  .example-feature__button:hover {
    background: #0056b3;
  }
`;

export function injectExampleFeatureStyles(): () => void {
  const styleElement = document.createElement("style");
  styleElement.textContent = exampleFeatureStyles;
  document.head.appendChild(styleElement);

  // Return cleanup function
  return () => {
    if (styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
  };
}
```

## Feature Testing Pattern

### Feature Test Structure

```typescript
// src/features/example-feature/__tests__/example-feature.test.ts
import { ExampleFeature } from "../example-feature";
import type { ExampleFeatureConfig } from "../types";

describe("ExampleFeature", () => {
  let feature: ExampleFeature;
  let config: ExampleFeatureConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      debug: false,
    };
    feature = new ExampleFeature(config);
  });

  afterEach(async () => {
    await feature.destroy();
  });

  test("should initialize correctly", async () => {
    await feature.init();
    expect(feature.isEnabled()).toBe(true);
  });

  test("should handle disabled state", () => {
    const disabledFeature = new ExampleFeature({ enabled: false });
    expect(disabledFeature.isEnabled()).toBe(false);
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
import { ExampleFeature } from "./features/example-feature";

const feature = new ExampleFeature({
  enabled: true,
  threshold: 100,
});

await feature.init();
```

## Events

- `example-feature:ready` - Emitted when feature is initialized
- `example-feature:update` - Emitted when feature data updates

## Dependencies

- None (self-contained)

```

```
