# Entry Point Specification

This document defines the main application initialization and IIFE (Immediately Invoked Function Expression) setup for the AdventureTime project.

## Main Entry Point Structure

### `src/main.ts`

The main entry point that wraps the entire application in an IIFE for bookmarklet compatibility.

```typescript
import { initApp, destroyApp } from "./core";
import type { AppConfig } from "./core/types";

// IIFE wrapper for bookmarklet compatibility
(function () {
  "use strict";

  // Prevent multiple executions
  if ((window as any).__ADVENTURE_TIME_LOADED__) {
    console.warn("AdventureTime already loaded");
    return;
  }
  (window as any).__ADVENTURE_TIME_LOADED__ = true;

  // Application configuration
  const config: AppConfig = {
    debug: false,
    features: {
      featureA: true,
      featureB: true,
    },
    ui: {
      theme: "default",
      position: "top-right",
    },
  };

  // Initialize and start application
  async function startApp() {
    try {
      await initApp(config);
    } catch (error) {
      console.error("Failed to start AdventureTime:", error);
    }
  }

  // Wait for DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp);
  } else {
    startApp();
  }

  // Expose global cleanup
  (window as any).AdventureTimeAPI = {
    version: "1.0.0",
    destroy: destroyApp,
  };
})();
```

## IIFE Pattern Details

### Self-Executing Function

```typescript
(function () {
  // All application code here
})();
```

### Strict Mode

- Always use `'use strict';` at the top
- Prevents common JavaScript pitfalls
- Better error handling and performance

### Global Namespace Protection

```typescript
// Avoid polluting global namespace
(function () {
  "use strict";

  // All variables are scoped to this function
  await initApp(config);

  // Only expose what's necessary
  if (typeof window !== "undefined") {
    (window as any).AdventureTimeAPI = {
      version: "1.0.0",
      destroy: destroyApp,
    };
  }
})();
```

## Initialization Sequence

### 1. Duplicate Prevention

```typescript
// Prevent multiple executions
if ((window as any).__ADVENTURE_TIME_LOADED__) {
  console.warn("AdventureTime already loaded");
  return;
}
(window as any).__ADVENTURE_TIME_LOADED__ = true;
```

### 2. Configuration Setup

```typescript
const config: AppConfig = {
  debug: process.env.NODE_ENV === "development",
  features: {
    // Feature toggles
  },
  ui: {
    // UI configuration
  },
};
```

### 3. DOM Ready Check

```typescript
// Wait for DOM if still loading
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => app.init());
} else {
  // DOM already ready
  app.init();
}
```

### 4. Error Handling

```typescript
try {
  await initApp(config);
} catch (error) {
  console.error("AdventureTime initialization failed:", error);

  // Optional: Show user-friendly error
  if (config.debug) {
    alert(`AdventureTime Error: ${error.message}`);
  }
}
```

## Environment Detection

### Browser Compatibility Check

```typescript
// Check for required browser features
const isSupported =
  typeof document !== "undefined" &&
  typeof window !== "undefined" &&
  "querySelector" in document &&
  "addEventListener" in document;

if (!isSupported) {
  console.error("Browser not supported");
  return;
}
```

### Feature Detection

```typescript
// Check for specific APIs
const hasRequiredAPIs =
  "MutationObserver" in window &&
  "requestAnimationFrame" in window &&
  "localStorage" in window;

if (!hasRequiredAPIs) {
  console.warn("Some features may not work in this browser");
}
```

## Configuration Management

### Default Configuration

```typescript
const defaultConfig: AppConfig = {
  debug: false,
  features: {
    featureA: true,
    featureB: true,
    featureC: false,
  },
  ui: {
    theme: "default",
    position: "top-right",
    showIntro: true,
  },
  performance: {
    enableAnimations: true,
    debounceMs: 100,
  },
};
```

### Runtime Configuration Override

```typescript
// Allow runtime configuration via URL parameters
const urlParams = new URLSearchParams(window.location.search);
const runtimeConfig = {
  debug: urlParams.get("debug") === "true",
  features: {
    featureA: urlParams.get("featureA") !== "false",
  },
};

// Merge configurations
const config = { ...defaultConfig, ...runtimeConfig };
```

## Cleanup and Destruction

### Cleanup Function

```typescript
let cleanupFunctions: (() => void)[] = [];

export async function destroyApp(): Promise<void> {
  // Run all cleanup functions
  const cleanupPromises = cleanupFunctions.map(async (cleanup) => {
    try {
      await cleanup();
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  });

  await Promise.all(cleanupPromises);
  cleanupFunctions = [];

  // Remove global flag
  delete (window as any).__ADVENTURE_TIME_LOADED__;
}

export function addCleanup(fn: () => void): void {
  cleanupFunctions.push(fn);
}
```

### Automatic Cleanup

```typescript
// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if ((window as any).AdventureTimeAPI) {
    (window as any).AdventureTimeAPI.destroy();
  }
});
```

## Build Output Format

### Production IIFE Output

```javascript
(function () {
  "use strict";

  // Minified application code
  // All imports resolved and inlined
  // CSS styles inlined as strings
  // No external dependencies
})();
```

### Development vs Production

- **Development**: Source maps, readable code, debug logs
- **Production**: Minified, no console logs, optimized
- **Both**: Same IIFE wrapper pattern

## Bookmarklet Integration

### Bookmarklet URL Format

```javascript
javascript: (function () {
  // Minified code from dist/adventure-time.iife.js
})();
```

### Loading External Script (Alternative)

```javascript
javascript: (function () {
  var s = document.createElement("script");
  s.src = "https://example.com/adventure-time.js";
  document.head.appendChild(s);
})();
```
