# Publog

Keeps track of what you (and your friends) ordered during one pub visit, so you can
check it against the bill when you leave. It's a mobile-first web app that you can add
to the iPhone Home Screen, and the item list keeps working without a connection.

Built with Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4 and
SQLite (Node's built-in `node:sqlite`, so no native packages).

## Getting started

Needs Node 22.13 or newer.

```bash
npm install
npm run db:seed      # dev user + one sample visit (credentials in scripts/seed-dev.ts)
npm run dev
```

Open http://localhost:3000 and sign in.

### Creating users

There is no sign-up. Create accounts (or reset a password) from the terminal:

```bash
npm run user:create -- you@example.com
```

It asks for the password twice without showing it. For automation, set
`PUBLOG_PASSWORD` instead.

## Scripts

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Development server                              |
| `npm run build`     | Production build                                |
| `npm start`         | Run the production build                        |
| `npm test`          | Unit tests (Vitest) for item rules and drafts   |
| `npm run typecheck` | TypeScript check                                |
| `npm run lint`      | ESLint                                          |

## Configuration

| Variable                | Default              | Meaning                                                   |
| ----------------------- | -------------------- | --------------------------------------------------------- |
| `DATABASE_PATH`         | `data/publog.sqlite` | Where the SQLite file lives                               |
| `SESSION_COOKIE_SECURE` | `true` in production | Set to `false` to sign in over plain HTTP (e.g. LAN test) |

## How it works

- **Sign-in**: `proxy.ts` sends visitors without a session cookie to `/login`.
  Every page, server action and the API checks the session against the database
  (`lib/auth.ts`). Sessions last 90 days.
- **Visits**: `/` lists them, `/visits/new` and `/visits/[id]/edit` create and edit.
  Each user only sees their own.
- **Items**: `/visits/[id]` edits the list in the browser. Every change is saved to
  `localStorage` straight away (`lib/draft.ts`). **Submit list** sorts by count and
  then sends the whole list to `PUT /api/visits/[id]/items`, which replaces what the
  server has. If the server can't be reached, the submit is retried when the phone
  is back online. The rules (merging names, totals, prices like `2,60`) live in
  `lib/items.ts` and are shared by the browser and the server.
- **Offline**: `public/sw.js` (only in production builds) keeps app files and the
  pages you've opened, so a visit page reloads even without a connection.

## Putting it on your iPhone

1. Deploy somewhere with **HTTPS** and a **persistent disk** for the SQLite file
   (a small VPS, Fly.io or Railway with a volume, etc.). Serverless hosts like Vercel
   don't keep files, so SQLite doesn't work there.
2. Open the site in Safari → Share → **Add to Home Screen**.

Over plain HTTP on your local network (`npm run dev -- -H 0.0.0.0`, then open
`http://<your-mac-ip>:3000`), everything works except offline mode, because
iOS only allows service workers on HTTPS.
