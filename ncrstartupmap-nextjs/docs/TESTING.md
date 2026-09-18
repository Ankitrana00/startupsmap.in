# Testing Guide

## Test Structure

```
tests/
├── unit/           # Unit tests for individual functions/components
├── integration/    # Integration tests for API endpoints
├── e2e/           # End-to-end tests with Playwright
├── fixtures/       # Test data
├── factories/      # Test data factories
├── helpers/        # Test utilities
├── mocks/          # Mock implementations
├── setup/          # Test setup configurations
└── coverage/       # Coverage reports
```

## Running Tests

### Unit Tests

```bash
npm run test:unit
```

### Integration Tests

```bash
npm run test:integration
```

### E2E Tests

```bash
npm run test:e2e
```

### All Tests

```bash
npm run test
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from "vitest";
import { applyFilters } from "@/lib/api/startups";

describe("applyFilters", () => {
  it("should filter by area", () => {
    const result = applyFilters(startups, { area: "Gurugram" }, "");
    expect(result).toHaveLength(1);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from "@playwright/test";

test("should render map", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[aria-label='Map']")).toBeVisible();
});
```

## Test Coverage

Target coverage:

- Lines: 70%
- Branches: 70%
- Functions: 70%
