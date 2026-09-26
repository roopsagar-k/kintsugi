# ShopLite — Kintsugi demo target

A small storefront (Vite + React + TypeScript + Tailwind + shadcn/ui) used to
demonstrate Kintsugi. It ships with **5 seeded bugs** for Bob to find and heal.

```bash
npm install
npm run dev      # http://localhost:5173
```

## Seeded bugs

| # | Bug | Lane | What a test catches |
|---|---|---|---|
| 1 | `/account` renders while logged out (no auth guard) | auth | should redirect to `/login` |
| 2 | Checkout accepts an empty email | ui | should show an error and not place the order |
| 3 | Decrementing cart quantity to 0 leaves a stray row | cart | the line item should be removed |
| 4 | Add-to-cart button is `max-md:hidden` on mobile | visual | button should be visible at 375px |
| 5 | Product page logs a `console.error` on mount | ui | no console errors on view |

Running Bob's `/qa-run` against this app produces exactly these 5 triaged tickets.

The bugs live in the source with `SEEDED BUG` comments:
- `src/store/store.tsx` — cart quantity (#3)
- `src/pages/Checkout.tsx` — empty email (#2)
- `src/pages/Account.tsx` — auth guard (#1)
- `src/pages/Product.tsx` — mobile button (#4) + console error (#5)

> This is a **demo target**, not part of the Kintsugi product — it's the app under test.
