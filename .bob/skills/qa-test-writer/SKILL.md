---
name: qa-test-writer
description: Use when writing or editing Kintsugi Playwright E2E specs under .kintsugi/tests/ — the conventions for spec structure, imports, selectors, and assertions. Auto-applies while authoring test files in kintsugi-qa mode.
---

# qa-test-writer — Kintsugi spec conventions

How to write Playwright specs that Kintsugi can run, triage, and heal. Specs live
at `.kintsugi/tests/<lane>/<feature>.spec.ts`.

## Required structure

- **Import from the shared fixtures**, never from `@playwright/test` directly:
  ```ts
  import { test, expect } from "../fixtures";
  ```
  The fixtures auto-capture console errors and failed HTTP requests and attach
  them to the result, which is what triage reads. Importing straight from
  `@playwright/test` loses that evidence.
- Relative path is `../fixtures` from a lane dir (`tests/<lane>/x.spec.ts` →
  `tests/fixtures.ts`). Only add depth if you nest deeper.

## Titles, structure, selectors

- **One behaviour per test.** Descriptive, stable titles — `rerun_test` and triage
  match on the title, so don't rename tests casually.
- Group related tests with `test.describe("<feature>", () => { ... })`.
- **Selectors, in order of preference:** `data-testid` → ARIA role/name
  (`getByRole`) → label/placeholder text → visible text. Avoid brittle CSS/nth
  selectors.
- Use web-first assertions that auto-wait (`await expect(locator).toBeVisible()`),
  not manual sleeps.

## Lanes → what to assert

| Lane | Focus |
|------|-------|
| `ui` | Elements render, forms submit, client validation, navigation works |
| `api` | Response `status()`, JSON body, error codes for bad input |
| `auth` | Login/logout, protected routes redirect when logged out |
| `edge` | Empty/boundary/invalid input, error states |
| `visual` | Layout / responsive; use the `visual_check` MCP tool for pixel diffs |

## Assertion discipline

- Assert the **real expected behaviour**, even when the app is currently buggy —
  a failing test is a valid finding the healer will fix. Never write a test to
  match a bug.
- Prefer specific assertions (`toHaveText`, `toHaveURL`, `toBe(400)`) over
  presence-only checks.

## Example

```ts
import { test, expect } from "../fixtures";

test.describe("checkout", () => {
  test("rejects an empty email at checkout", async ({ page }) => {
    await page.goto("/checkout");
    await page.getByTestId("email").fill("");
    await page.getByRole("button", { name: /place order/i }).click();
    await expect(page.getByTestId("email-error")).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/); // must NOT proceed
  });
});
```
