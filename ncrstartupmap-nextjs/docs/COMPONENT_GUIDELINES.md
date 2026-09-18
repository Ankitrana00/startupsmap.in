# Component Guidelines

## File Organization

- Place components in `src/components/` organized by feature
- Each component should have its own directory when it has multiple files
- Use kebab-case for directory names, PascalCase for component files

## Naming Conventions

- Component files: PascalCase (e.g., `StartupCard.tsx`)
- Component directories: kebab-case (e.g., `startup-card/`)
- Hooks: camelCase with `use` prefix (e.g., `useStartups.ts`)
- Types: PascalCase (e.g., `Startup.ts`)

## Component Structure

```tsx
// Props interface first
interface MyComponentProps {
  // Props definition
}

// Component implementation
export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  // Implementation
}

// Default export
export default MyComponent;
```

## Server vs Client Components

- Use `"use client"` directive for components that use hooks, state, or event handlers
- Default to Server Components for data fetching and layout
- Mark components with `"use client"` only when necessary

## Accessibility

- Always include proper ARIA labels
- Use semantic HTML elements
- Ensure keyboard navigation works
- Test with screen readers

## Performance

- Use `React.memo` for expensive components
- Implement code splitting with `next/dynamic`
- Optimize images with Next.js Image component
- Use `useMemo` and `useCallback` when appropriate
