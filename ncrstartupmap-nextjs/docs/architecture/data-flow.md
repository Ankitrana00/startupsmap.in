# Data Flow

## Client to Server

```
User Action
    ↓
Client Component (useState, useEffect)
    ↓
TanStack Query Mutation / API Call
    ↓
Server Action / API Route
    ↓
Database Operation
    ↓
Response
    ↓
Client State Update (Zustand)
```

## Server to Client

```
Server Component
    ↓
Data Fetching (useQuery)
    ↓
Database Query
    ↓
Data Returned to Component
    ↓
HTML Sent to Client
    ↓
Hydration
```

## State Flow

1. **Server State** - TanStack Query manages cached data
2. **Client State** - Zustand manages UI state
3. **URL State** - Search params for sharing/filtering
4. **Local State** - React useState for temporary UI state

## Caching Strategy

- **Stale-while-revalidate:** First request from cache, then refetch
- **Time-based:** 5-minute stale time for startup data
- **Manual invalidation:** On submit/update operations
