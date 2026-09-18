# State Management Guide

## Overview

This project uses Zustand for client-side state management and TanStack Query for server state.

## Client State (Zustand)

### Dashboard Store

```typescript
import { useDashboardStore } from "@/lib/state/store";

const { view, search, filters, setView, setSearch, setFilter } = useDashboardStore();
```

### Actions Store

```typescript
import { useActionsStore } from "@/lib/state/actions";
```

## Server State (TanStack Query)

### Using useQuery

```typescript
import { useQuery } from "@tanstack/react-query";

const { data, isLoading, error } = useQuery({
  queryKey: ["startups", filters],
  queryFn: () => fetchStartups(filters),
});
```

### Using useSuspenseQuery

```typescript
import { useSuspenseQuery } from "@tanstack/react-query";

const { data } = useSuspenseQuery({
  queryKey: ["startups"],
  queryFn: () => fetchStartups(),
});
```

## Persistence

State persistence is handled through localStorage via `persistence.ts`.

```typescript
import { loadState, saveState } from "@/lib/state/persistence";
```
