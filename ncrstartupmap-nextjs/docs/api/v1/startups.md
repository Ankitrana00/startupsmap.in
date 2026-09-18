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
