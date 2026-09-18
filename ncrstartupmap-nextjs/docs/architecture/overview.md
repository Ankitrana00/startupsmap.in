# Architecture Overview

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **State Management:** Zustand + TanStack Query
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** NextAuth.js
- **Testing:** Vitest + Playwright

## Architecture Layers

### Presentation Layer

- Next.js App Router pages
- React components
- Client-side state (Zustand)

### Business Logic Layer

- API routes
- Server actions
- Data validation
- Business rules

### Data Layer

- Database models
- Migrations
- Data access objects

## Key Design Decisions

1. **Server Components by default** - Better performance, SEO
2. **Client Components only when needed** - Hooks, interactivity
3. **Zustand for client state** - Simple, flexible
4. **TanStack Query for server state** - Caching, synchronization
5. **Prisma for ORM** - Type safety, migrations
