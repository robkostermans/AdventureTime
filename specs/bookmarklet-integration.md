# Bookmarklet Integration Specification

This document defines the bookmarklet-specific considerations, constraints, and implementation details for the AdventureTime project.

## Bookmarklet Fundamentals

### What is a Bookmarklet

A bookmarklet is a bookmark stored in a web browser that contains JavaScript code instead of a URL. When clicked, it executes the JavaScript code on the current page.

### Basic Bookmarklet Structure

```javascript
javascript: (function () {
  // Your code here
})();
```

## Size Constraints

### URL Length Limitations

- **Internet Explorer**: ~2,083 characters
- **Chrome**: ~2MB (practically unlimited)
- **Firefox**: ~65,536 characters
- **Safari**: ~80,000 characters
- **Target**: Keep under 2,000 characters for maximum compatibility

### Optimization Strategies

1. **Minification**: Remove whitespace, comments, and shorten variable names
2. **External Loading**: Load larger scripts from external URLs
3. **Compression**: Use URL-safe compression techniques
4. **Code Splitting**: Load only essential code in bookmarklet

## Security Considerations

### Content Security Policy (CSP)

Many websites implement CSP that can block bookmarklet execution:

```typescript
// Check for CSP restrictions
function checkCSPCompatibility(): boolean {
  try {
    // Test if we can create and execute scripts
    const script = document.createElement("script");
    script.textContent = "void(0);";
    document.head.appendChild(script);
    document.head.removeChild(script);
    return true;
  } catch (error) {
    console.warn("CSP may be blocking script execution");
    return false;
  }
}
```

### Same-Origin Policy

Bookmarklets run in the context of the current page and are subject to same-origin restrictions:

```typescript
// Safe cross-origin requests
function safeFetch(url: string): Promise<Response | null> {
  try {
    return fetch(url, {
      mode: "cors",
      credentials: "omit",
    });
  } catch (error) {
    console.warn("Cross-origin request blocked:", error);
    return Promise.resolve(null);
  }
}
```

## Execution Environment

### Page State Detection

```typescript
// Detect page loading state
function getPageState(): "loading" | "interactive" | "complete" {
  return document.readyState;
}

// Wait for DOM if needed
function ensureDOMReady(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => resolve());
    } else {
      resolve();
    }
  });
}
```

### Conflict Prevention

```typescript
// Prevent conflicts with existing page scripts
(function () {
  "use strict";

  // Check if already loaded
  if (window.__ADVENTURE_TIME_LOADED__) {
    console.warn("AdventureTime already active");
    return;
  }

  // Mark as loaded
  window.__ADVENTURE_TIME_LOADED__ = true;

  // Store original values that might be overwritten
  const originalConsole = window.console;

  // Cleanup function
  window.__ADVENTURE_TIME_CLEANUP__ = function () {
    delete window.__ADVENTURE_TIME_LOADED__;
    delete window.__ADVENTURE_TIME_CLEANUP__;
    // Restore any overwritten globals
  };

  // Your bookmarklet code here
})();
```

## Distribution Methods

### Method 1: Inline Bookmarklet

Entire code embedded in the bookmark URL:

```javascript
javascript: (function () {
  "use strict"; /* minified code here */
})();
```

**Pros**: Self-contained, works offline
**Cons**: Size limitations, hard to update

### Method 2: Loader Bookmarklet

Small loader that fetches the main script:

```javascript
javascript: (function () {
  var s = document.createElement("script");
  s.src = "https://example.com/bookmarklet.js?v=1.0.0";
  s.onload = function () {
    this.remove();
  };
  document.head.appendChild(s);
})();
```

**Pros**: No size limits, easy updates, caching
**Cons**: Requires internet connection, external dependency

### Method 3: Hybrid Approach

Small inline code with fallback to external loading:

```javascript
javascript: (function () {
  if (window.__ADVENTURE_TIME_LOADED__) return;
  try {
    /* Essential inline code */
    loadExternal();
  } catch (e) {
    console.error("AdventureTime failed:", e);
  }
  function loadExternal() {
    var s = document.createElement("script");
    s.src = "https://cdn.example.com/adventure-time-full.js";
    document.head.appendChild(s);
  }
})();
```

## Build Integration

### Vite Configuration for Bookmarklet

```typescript
// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/main.ts",
      name: "AdventureTime",
      fileName: "adventure-time",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        // Ensure single file output
        inlineDynamicImports: true,
        manualChunks: undefined,
        // Custom banner for bookmarklet format
        banner: "javascript:(function(){",
        footer: "})();",
      },
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info"],
      },
      mangle: {
        toplevel: true,
      },
    },
  },
});
```

### Post-Build Processing

```typescript
// scripts/build-bookmarklet.ts
import fs from "fs";
import path from "path";

function buildBookmarklet() {
  const distPath = path.join(__dirname, "../dist/adventure-time.iife.js");
  const content = fs.readFileSync(distPath, "utf-8");

  // Wrap in bookmarklet format
  const bookmarklet = `javascript:(function(){${content}})();`;

  // URL encode for safety
  const encoded = encodeURIComponent(bookmarklet);

  // Write bookmarklet file
  fs.writeFileSync(
    path.join(__dirname, "../dist/adventure-time.txt"),
    bookmarklet
  );

  // Write encoded version
  fs.writeFileSync(
    path.join(__dirname, "../dist/adventure-time-encoded.txt"),
    encoded
  );

  console.log(`AdventureTime size: ${bookmarklet.length} characters`);
  console.log(`Encoded size: ${encoded.length} characters`);
}

buildBookmarklet();
```

## Testing Strategies

### Local Testing

```html
<!-- test.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>Bookmarklet Test Page</title>
  </head>
  <body>
    <h1>Test Page</h1>
    <p>This is a test page for bookmarklet development.</p>

    <script>
      // Simulate bookmarklet execution
      function testBookmarklet() {
        // Load your built bookmarklet code
        const script = document.createElement("script");
        script.src = "./dist/adventure-time.iife.js";
        document.head.appendChild(script);
      }
    </script>

    <button onclick="testBookmarklet()">Test Bookmarklet</button>
  </body>
</html>
```

### Cross-Site Testing

Test on various websites to ensure compatibility:

```typescript
// Test suite for different environments
const testSites = [
  "https://example.com",
  "https://github.com",
  "https://stackoverflow.com",
  "https://news.ycombinator.com",
];

// Automated testing script
async function testBookmarkletCompatibility() {
  for (const site of testSites) {
    console.log(`Testing on ${site}`);
    // Use headless browser to test
    // Check for errors, CSP issues, etc.
  }
}
```

## User Experience

### Installation Instructions

```markdown
## How to Install

1. **Copy the bookmarklet code** from the text box below
2. **Create a new bookmark** in your browser
3. **Paste the code** as the URL/location
4. **Name your bookmark** (e.g., "My Bookmarklet")
5. **Save the bookmark**

## How to Use

1. **Navigate** to any webpage
2. **Click** your bookmarklet bookmark
3. **Enjoy** the enhanced functionality!
```

### Error Handling for Users

```typescript
// User-friendly error handling
function handleBookmarkletError(error: Error): void {
  const userMessage = `
    AdventureTime Error: ${error.message}
    
    This might be due to:
    • Website security restrictions
    • Browser compatibility issues
    • Network connectivity problems
    
    Try refreshing the page and running the bookmarklet again.
  `;

  // Show user-friendly error
  if (confirm(userMessage + "\n\nWould you like to report this issue?")) {
    // Open issue reporting page
    window.open("https://github.com/your-repo/issues/new", "_blank");
  }
}
```

## Performance Optimization

### Lazy Loading

```typescript
// Load features on demand
class AdventureTimeApp {
  private loadedFeatures = new Set<string>();

  async loadFeature(featureName: string): Promise<void> {
    if (this.loadedFeatures.has(featureName)) {
      return;
    }

    // Dynamic import simulation for bookmarklet
    const featureCode = await this.getFeatureCode(featureName);
    const feature = new Function("return " + featureCode)();

    await feature.init();
    this.loadedFeatures.add(featureName);
  }

  private async getFeatureCode(name: string): Promise<string> {
    // Fetch feature code from CDN or inline storage
    const response = await fetch(`https://cdn.example.com/features/${name}.js`);
    return response.text();
  }
}
```

### Memory Management

```typescript
// Cleanup resources to prevent memory leaks
class AdventureTimeCleanup {
  private cleanupTasks: (() => void)[] = [];

  addCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  cleanup(): void {
    this.cleanupTasks.forEach((task) => {
      try {
        task();
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    });
    this.cleanupTasks = [];
  }
}

// Auto-cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (window.__ADVENTURE_TIME_CLEANUP__) {
    window.__ADVENTURE_TIME_CLEANUP__();
  }
});
```
