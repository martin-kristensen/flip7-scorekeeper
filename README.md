# Flip 7 Scorekeeper

A small web app for tracking Flip 7 rounds with:

- Node.js and TypeScript on the server
- Plain HTML, CSS, and browser JavaScript on the frontend
- A JSON file database stored in `data/database.json`

## Why this stack

This setup is intentionally simple to deploy over FTP:

- no external database server
- no frontend build pipeline
- no native database module to compile
- one `dist/` folder plus `public/` and `data/`

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm install
npm run build
npm start
```

## FTP deployment

1. Run `npm install` and `npm run build` locally.
2. Upload these items to your server:
   - `dist/`
   - `public/`
   - `package.json`
   - `data/` (create it if it does not exist)
3. Run `npm install --omit=dev` on the server.
4. Start the app with `node dist/server.js`.
5. Point your web server or reverse proxy at the Node port, or use your host's Node app setup.

## Data storage

All game data is stored in:

`data/database.json`

That makes it easy to back up, move, or download through FTP whenever needed.
