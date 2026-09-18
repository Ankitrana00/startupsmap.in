# Migration: Old Components

This directory contains components migrated from the previous TanStack Start project.

## Migrated Components

- `src/components/views/MapView/Map.tsx` - Original map implementation
- `src/components/views/MapView/MapPanel.tsx` - Original map panel
- `src/components/views/GridView/StartupCard.tsx` - Original card component
- `src/components/toolbar/*` - Original toolbar components

## Migration Notes

1. Changed import paths from `@/` to project root
2. Updated Next.js-specific patterns
3. Migrated from TanStack Router to Next.js App Router
4. Updated CSS classes for Tailwind CSS v4
