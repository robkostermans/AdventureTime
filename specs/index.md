# AdventureTime Project Specifications

This document provides an overview of the specifications for a modular vanilla TypeScript project that compiles into a single optimized JavaScript file for bookmarklet usage.

## App Concept

For the core game concept, mechanics, and world system, see the [App Concept](./app-concept.md) document.

## Project Overview

A vanilla TypeScript application with modular architecture that:

- Uses no frameworks (pure TypeScript/JavaScript)
- Organizes code by features in separate files/folders
- Compiles to a single minified JavaScript file
- Self-executes on script load (IIFE pattern)
- Can be used as a bookmarklet (nice to have)

## Architecture Specifications

| Component               | Description                                    | Specification                                           |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| App Concept             | Core game idea, mechanics, and world system    | [App Concept](./app-concept.md)                         |
| Interaction Layer       | DOM element abstraction into game artifacts    | [Interaction Layer](./interaction-layer.md)             |
| Design Layer            | Decorative blobs and themed regions            | [Design Layer](./design-layer.md)                       |
| Inventory System        | Artifact collection and inventory management   | [Inventory System](./inventory-system.md)               |
| Navigation Indicator    | Compass pointing to nearest direction artifact | [Navigation](./navigation.md)                           |
| Project Structure       | Overall file and folder organization           | [Project Structure](./project-structure.md)             |
| Build System            | TypeScript compilation and bundling setup      | [Build System](./build-system.md)                       |
| Module System           | How features are organized and imported        | [Module System](./module-system.md)                     |
| Entry Point             | Main application initialization and IIFE setup | [Entry Point](./entry-point.md)                         |
| Feature Architecture    | How individual features are structured         | [Feature Architecture](./feature-architecture.md)       |
| Bookmarklet Integration | Bookmarklet-specific considerations            | [Bookmarklet Integration](./bookmarklet-integration.md) |

## Key Requirements

1. **Vanilla TypeScript**: No external frameworks or libraries
2. **Modular Design**: Each feature in its own file/folder
3. **Single File Output**: All code bundled into one optimized JS file
4. **Self-Executing**: IIFE pattern for immediate execution
5. **Bookmarklet Ready**: Can be embedded in browser bookmarks
6. **Type Safety**: Full TypeScript support during development
7. **Optimized Build**: Minified and tree-shaken output

## Development Workflow

1. Write modular TypeScript code in feature-based structure
2. Use Vite for development server and hot reloading
3. Build produces single optimized JavaScript file
4. Output can be used directly as bookmarklet code
