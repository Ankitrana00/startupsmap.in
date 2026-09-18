# API Reference

## Startups API

### GET /api/startups

Get all startups with optional filters.

**Query Parameters:**

- `area` - Filter by area
- `sector` - Filter by sector
- `stage` - Filter by stage
- `search` - Search by name/description

**Response:**

```json
{
  "startups": Startup[],
  "meta": {
    "total": number,
    "page": number,
    "pageSize": number
  }
}
```

### POST /api/startups

Create a new startup submission.

**Request Body:**

```json
{
  "name": "string",
  "description": "string",
  "sector": "string",
  "stage": "string",
  "area": "string",
  "founded": number,
  "is_hiring": boolean | null,
  "lat": number | null,
  "lng": number | null,
  "website": string | null,
  "linkedin": string | null
}
```

## Submit API

### POST /api/submit

Submit a startup for review. Delivers the details to the owner's inbox
(subject prefixed `[Startup Submission]`).

**Rate Limit:** 5 requests per hour per IP

**Security:** same-origin check (403), honeypot field (`honeypot_website`,
silently discarded), server-side zod validation.

**Request Body:**

```json
{
  "name": "string (max 100)",
  "description": "string (max 1000)",
  "sector": "Fintech | Healthtech | Edtech | E-commerce | AI | SaaS",
  "stage": "Idea | Seed | Series A | Series B | Growth",
  "area": "Delhi | Gurugram | Noida | Faridabad | Ghaziabad",
  "founded": "number (1900-2100)",
  "is_hiring": "boolean | null",
  "website": "string (url, optional)",
  "linkedin": "string (url, optional)",
  "address": "string (max 255)",
  "lat": "number (-90..90, required)",
  "lng": "number (-180..180, required)",
  "honeypot_website": "string (must be empty)"
}
```

**Responses:**

- `201` — delivered
- `400` — validation / malformed JSON (`{ "error": string }`)
- `403` — cross-site origin
- `429` — rate limited
- `500` — email delivery failure

## Promote API

### POST /api/promote

Submit a promotion-ads request ("Promote Your Startup" form). Delivers the
lead to the owner's inbox (subject prefixed `[Promotion Ad]`).

**Rate Limit:** 3 requests per hour per IP (independent of /api/submit)

**Security:** same-origin check (403), honeypot field (`honeypot_website`,
silently discarded), server-side zod validation.

**Request Body:**

```json
{
  "companyName": "string (max 100)",
  "pocName": "string (max 100)",
  "pocEmail": "string (email)",
  "contactNumber": "string (7-15 chars, digits and + - ( ) only)",
  "message": "string (max 1000)",
  "honeypot_website": "string (must be empty)"
}
```

**Responses:**

- `201` — delivered
- `400` — validation / malformed JSON (`{ "error": string }`)
- `403` — cross-site origin
- `429` — rate limited
- `500` — email delivery failure

## Auth API

### POST /api/auth/signin

Sign in with credentials.

### POST /api/auth/signout

Sign out current user.

## WebSocket

### WS /api/ws

Real-time updates for startup submissions.
