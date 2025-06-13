# Project Structure Specification

This document defines the file and folder organization for the AdventureTime project.

## Directory Structure

```
project-root/
├── src/
│   ├── main.ts                 # Entry point and IIFE wrapper
│   ├── core/
│   │   ├── index.ts           # Core module exports
│   │   ├── app.ts             # Main application functions
│   │   ├── types.ts           # Global type definitions
│   │   └── utils.ts           # Shared utility functions
│   ├── features/
│   │   ├── feature-a/
│   │   │   ├── index.ts       # Feature A exports
│   │   │   ├── feature-a.ts   # Feature A implementation
│   │   │   └── types.ts       # Feature A specific types
│   │   ├── feature-b/
│   │   │   ├── index.ts       # Feature B exports
│   │   │   ├── feature-b.ts   # Feature B implementation
│   │   │   └── types.ts       # Feature B specific types
│   │   └── index.ts           # All features export
│   └── styles/
│       ├── main.module.css    # Main styles
│       ├── base.module.css    # Base styles
│       └── components.module.css # Component-specific styles
├── specs/                     # Specification documents
├── dist/                      # Build output
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## File Naming Conventions

- **TypeScript files**: Use kebab-case (e.g., `feature-name.ts`)
- **Directories**: Use kebab-case (e.g., `feature-name/`)
- **Index files**: Always named `index.ts` for clean imports
- **Type files**: Named `types.ts` within each module
- **Main entry**: Always `main.ts` at src root

## Module Organization

### Core Module (`src/core/`)

- Contains application foundation and shared utilities
- Exports main app functions and global types
- Provides common functionality used across features

### Features Module (`src/features/`)

- Each feature gets its own directory
- Self-contained with own types and implementation
- Exports through index.ts for clean imports

### Styles Module (`src/styles/`)

- CSS modules for scoped styling
- Organized by component/feature
- Compiled and bundled by Vite

## Import Patterns

```typescript
// Clean feature imports
import { initFeatureA } from "./features/feature-a";
import { initFeatureB } from "./features/feature-b";

// Core imports
import { initApp, utils } from "./core";

// Style imports
import styles from "./styles/main.module.css";
import baseStyles from "./styles/base.module.css";
```

## Build Output

- Single file: `dist/adventure-time.js`
- Minified and optimized
- Self-executing IIFE format
- All dependencies inlined
