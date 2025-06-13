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
import { FeatureManager } from "../features";
import { StyleManager } from "../styles";
import type { AppConfig } from "./types";

export class App {
  private features: FeatureManager;
  private styles: StyleManager;

  constructor(config: AppConfig) {
    this.features = new FeatureManager();
    this.styles = new StyleManager();
  }

  public init(): void {
    this.styles.inject();
    this.features.initialize();
  }
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
export { FeatureA } from "./feature-a";
export { FeatureB } from "./feature-b";

// Feature manager
export class FeatureManager {
  private features: Map<string, any> = new Map();

  public register(name: string, feature: any): void {
    this.features.set(name, feature);
  }

  public initialize(): void {
    this.features.forEach((feature) => {
      if (feature.init) {
        feature.init();
      }
    });
  }
}
```

### Individual Feature Pattern

#### `src/features/feature-a/index.ts`

```typescript
export { FeatureA } from "./feature-a";
export type { FeatureAConfig, FeatureAState } from "./types";
```

#### `src/features/feature-a/feature-a.ts`

```typescript
import type { FeatureAConfig, FeatureAState } from "./types";

export class FeatureA {
  private config: FeatureAConfig;
  private state: FeatureAState;

  constructor(config: FeatureAConfig) {
    this.config = config;
    this.state = { initialized: false };
  }

  public init(): void {
    // Feature initialization logic
    this.state.initialized = true;
  }

  public execute(): void {
    if (!this.state.initialized) {
      throw new Error("FeatureA not initialized");
    }
    // Feature execution logic
  }
}
```

## Style Module System

### `src/styles/index.ts`

```typescript
export { StyleManager } from "./style-manager";
export { baseStyles } from "./base";
export { componentStyles } from "./components";
```

### CSS-in-JS Pattern

```typescript
// src/styles/base.ts
export const baseStyles = `
  .adventure-time-container {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 999999;
  }
`;

// Style injection
export class StyleManager {
  public inject(): void {
    const style = document.createElement("style");
    style.textContent = baseStyles + componentStyles;
    document.head.appendChild(style);
  }
}
```

## Import Conventions

### Absolute Imports (from src root)

```typescript
// Main entry point imports
import { App } from "./core";
import { FeatureA, FeatureB } from "./features";
import { StyleManager } from "./styles";
```

### Relative Imports (within modules)

```typescript
// Within feature modules
import { FeatureAConfig } from "./types";
import { helperFunction } from "./utils";
```

### Type-Only Imports

```typescript
// Import only types
import type { AppConfig } from "./core/types";
import type { FeatureAState } from "./features/feature-a/types";
```

## Module Registration Pattern

### Feature Registration

```typescript
// In main.ts
import { App } from "./core";
import { FeatureA, FeatureB } from "./features";

const app = new App({
  features: [new FeatureA({ enabled: true }), new FeatureB({ enabled: false })],
});
```

## Tree Shaking Optimization

### Export Patterns for Tree Shaking

```typescript
// Good - Named exports
export { FeatureA } from "./feature-a";
export { FeatureB } from "./feature-b";

// Avoid - Default exports with objects
export default {
  FeatureA,
  FeatureB,
};
```

### Conditional Imports

```typescript
// Dynamic feature loading based on config
if (config.features.featureA) {
  const { FeatureA } = await import("./features/feature-a");
  // Use FeatureA
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

- CSS generation and injection
- Theme management
- Component styling
