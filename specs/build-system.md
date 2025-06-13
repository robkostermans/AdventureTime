# Build System Specification

This document defines the TypeScript compilation and bundling setup using Vite for the AdventureTime project.

## Build Tools

### Primary Tools

- **Vite**: Modern build tool and dev server
- **TypeScript**: Type checking and compilation
- **Rollup**: Bundling (via Vite)
- **Terser**: Minification (via Vite)

### Configuration Files

#### `package.json`

```json
{
  "name": "adventure-time",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

#### `vite.config.ts`

```typescript
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
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
});
```

#### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Build Process

### Development Mode

1. Run `npm run dev`
2. Vite starts development server
3. TypeScript files are compiled on-the-fly
4. Hot module replacement for fast development
5. Source maps for debugging

### Production Build

1. Run `npm run build`
2. TypeScript compiler checks types
3. Vite bundles all modules into single file
4. CSS is inlined into JavaScript
5. Code is minified and optimized
6. Output: `dist/adventure-time.iife.js`

## Build Optimizations

### Code Splitting Prevention

- `inlineDynamicImports: true` - Prevents code splitting
- `manualChunks: undefined` - Forces single chunk output

### Asset Inlining

- `assetsInlineLimit: 100000000` - Inlines all assets
- `cssCodeSplit: false` - Inlines CSS into JS

### Minification

- Terser minification with aggressive settings
- Console and debugger statements removed
- Dead code elimination
- Variable name mangling

## Output Format

### IIFE (Immediately Invoked Function Expression)

```javascript
(function () {
  "use strict";
  // All application code here
  // Self-executing on load
})();
```

### File Size Targets

- Target: < 50KB minified
- Gzipped: < 15KB
- No external dependencies
- All code self-contained

## Development Workflow

1. **Start Development**: `npm run dev`
2. **Type Checking**: Continuous via TypeScript
3. **Hot Reloading**: Automatic on file changes
4. **Build Production**: `npm run build`
5. **Test Output**: Copy `dist/adventure-time.iife.js` content to bookmarklet
