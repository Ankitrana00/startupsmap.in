> **STATUS: PLANNED — NOT IMPLEMENTED.**
> There is currently **no `/api/v1/*` route in this codebase.** Everything below
> documents a proposed versioned surface (fix plan `P2-2`/`P2-3`), not live
> behaviour. Do not build clients against it yet.
>
> What actually exists today:
>
> | Endpoint | Method | Purpose |
> | --- | --- | --- |
> | `/api/startups` | `GET` | Paginated + filterable public list (`page`, `limit`, `area`, `sector`, `stage`, `search`). Response is `{ startups, meta: { total, page, pageSize, totalPages } }`, cached 60s. |
> | `/api/startups` | `POST` | Authorized insert (JWT cookie). Body validated; on success it invalidates the list cache. |
> | `/api/submit` | `POST` | Public submission form → email + Supabase insert. Supports `Idempotency-Key`. |
> | `/api/promote` | `POST` | Public promotion lead → email. Supports `Idempotency-Key`. |
> | `/api/ready` | `GET` | Readiness probe (no secret values). |
>
> The real response shape and status codes live in `src/app/api/startups/route.ts`
> and `src/lib/types/api.ts`.


# Startups API v1

## Endpoints

### List Startups

```
GET /api/v1/startups
```

**Query Parameters:**

| Parameter | Type   | Description      |
| --------- | ------ | ---------------- |
| area      | string | Filter by area   |
| sector    | string | Filter by sector |
| stage     | string | Filter by stage  |
| search    | string | Search query     |
| page      | number | Page number      |
| limit     | number | Items per page   |

**Response:**

```json
{
  "data": Startup[],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### Get Startup

```
GET /api/v1/startups/:id
```

**Response:**

```json
{
  "data": Startup
}
```

### Create Startup

```
POST /api/v1/startups
```

**Request Body:**

```json
{
  "name": "string",
  "description": "string",
  "sector": "string",
  "stage": "string",
  "area": "string",
  "founded": 2024,
  "is_hiring": true,
  "lat": 28.6139,
  "lng": 77.209,
  "website": "string",
  "linkedin": "string"
}
```
