# Flip 7 Scorekeeper

Flip 7 Scorekeeper is a mobile-first scorekeeping app for Flip 7. It runs with a small Node/TypeScript backend, a vanilla HTML/CSS/JavaScript frontend, and Postgres for persistence.

## What it does

- Start a new game with a title, game mode, and target score
- Enter players quickly on mobile
- Score rounds with fast next-input flow
- Reorder the round view by entered order or leader first
- Keep game history, archive games, and resume old tables
- Show stats for the current or most recent game
- Support English and Swedish
- Support light, dark, and system theme modes

## Stack

- Backend: Node.js, Express, TypeScript
- Frontend: plain HTML, CSS, and browser JavaScript
- Database: Postgres
- Storage model: one browser session id in a cookie, game state in Postgres

## Project layout

- `src/server.ts` - HTTP API, session cookie handling, and static file hosting
- `src/store.ts` - Postgres store and game summary helpers
- `src/types.ts` - shared game and database types
- `public/index.html` - app shell
- `public/app.js` - frontend app logic
- `public/styles.css` - UI styling
- `public/assets/` - logo and favicon assets

## Local setup

1. Install dependencies.

```bash
npm install
```

2. Create your environment file.

```bash
cp .env.example .env
```

3. Start Postgres.

```bash
npm run db:start
```

4. Start the dev server.

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

The local database uses the connection string in `.env`. The default points at the Docker Postgres container started by `npm run db:start`.

## Scripts

- `npm run dev` - run the server with `tsx watch`
- `npm run build` - compile TypeScript to `dist/`
- `npm start` - run the built server from `dist/`
- `npm run db:start` - start the local Postgres container
- `npm run db:stop` - stop the local Postgres container

## Deployment

The app is ready for Vercel or another Node host as long as `DATABASE_URL` points to a managed Postgres database. The cookie only stores the session identifier, so the same code can run locally and in production.

## Notes

- Keep the frontend mobile-first.
- Avoid changing backend or database behavior unless the UI needs a small, direct adjustment.
- Preserve the current vanilla JS app structure unless there is a strong reason to introduce a framework.
