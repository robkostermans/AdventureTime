# Project Structure Specification

This document defines the file and folder organization for the AdventureTime project.

## Directory Structure

```
project-root/
├── src/
│   ├── main.ts                 # Entry point and IIFE wrapper
│   ├── core/
│   │   ├── index.ts           # Core module exports
│   │   ├── app.ts             # Main application class
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
│       ├── index.ts           # Style exports
│       ├── base.ts            # Base styles
│       └── components.ts      # Component-specific styles
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
- Exports main App class and global types
- Provides common functionality used across features

### Features Module (`src/features/`)

- Each feature gets its own directory
- Self-contained with own types and implementation
- Exports through index.ts for clean imports

### Styles Module (`src/styles/`)

- CSS-in-JS style definitions
- Organized by component/feature
- Compiled inline with JavaScript

## Import Patterns

```typescript
// Clean feature imports
import { FeatureA } from "./features/feature-a";
import { FeatureB } from "./features/feature-b";

// Core imports
import { App, Utils } from "./core";

// Style imports
import { baseStyles, componentStyles } from "./styles";
```

## Build Output

- Single file: `dist/adventure-time.js`
- Minified and optimized
- Self-executing IIFE format
- All dependencies inlined
