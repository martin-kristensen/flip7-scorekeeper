# Agent Notes

This repo is a small Flip 7 scorekeeping app. Keep changes tight and consistent with the current stack.

## Stack

- Backend: Node.js, Express, TypeScript
- Frontend: plain HTML, CSS, and browser JavaScript
- Persistence: Postgres through `DATABASE_URL`
- Session identity: cookie-based browser session id

## Important files

- `src/server.ts` - API routes, session cookie handling, static hosting
- `src/store.ts` - Postgres persistence and game summary helpers
- `src/types.ts` - shared types
- `public/app.js` - app state, rendering, and interaction logic
- `public/styles.css` - all UI styling
- `public/index.html` - app shell and overlays

## Working rules

- Keep the frontend mobile-first.
- Preserve the vanilla JS architecture unless a framework migration is explicitly requested.
- Avoid backend or database changes unless the UI requires a small supporting adjustment.
- Do not break existing routes, session handling, or Postgres storage.
- Prefer small, direct changes over broad refactors.
- Run `node --check public/app.js` and `npm run build` after code changes.

## UX notes

- The current app uses playful Flip 7 copy and a dark theme.
- Current-game score entry is the primary interaction.
- New-game setup already supports title, deck mode, target score, and player entry.
- Celebration and modal overlays should remain lightweight and non-blocking.

