# Pablo

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
`PABLO_PASSWORD` instead.

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
| `DATABASE_PATH`         | `data/pablo.sqlite` | Where the SQLite file lives                               |
| `SESSION_COOKIE_SECURE` | `true` in production | Set to `false` to sign in over plain HTTP (e.g. LAN test) |

## How it works

- **Sign-in**: `proxy.ts` sends visitors without a session cookie to `/login`.
  Every page, server action and the API checks the session against the database
  (`lib/auth.ts`). Sessions last 90 days.
- **Visits**: `/` lists them, `/visits/new` and `/visits/[id]/edit` create and edit.
  Each user only sees their own.
- **Items**: `/visits/[id]` edits the list in the browser. Every change is saved to
  `localStorage` straight away (`lib/draft.ts`). Configured number of seconds after the last change
  (or straight away on **Submit now**, or when the page is hidden or left) the list
  is sorted by count and sent whole to `PUT /api/visits/[id]/items`, which replaces
  what the server has. If the server can't be reached, the submit is retried when
  the phone is back online. The rules (merging names, totals, prices like `2,60`) live in
  `lib/items.ts` and are shared by the browser and the server.
- **Offline**: `public/sw.js` (only in production builds) keeps app files and the
  pages you've opened, so a visit page reloads even without a connection.

## Deploying with Dokku

Pablo runs on the Hetzner VPS next to the other Dokku apps, at
**https://pablo.webiky.online**. Dokku builds the `Dockerfile` on the server when you
`git push`, runs the container, puts its nginx in front and gets a free Let's Encrypt
certificate.

```
https://pablo.webiky.online
  → Dokku's nginx (HTTPS certificate from Let's Encrypt)
    → pablo container, port 5000 (Next.js standalone server, runs as user "node")
        /app/data  ←  /var/lib/dokku/data/storage/pablo on the server (the SQLite file)
```

Files in the repo that Dokku uses:

| File            | Purpose                                                               |
| --------------- | --------------------------------------------------------------------- |
| `Dockerfile`    | Builds the image: installs, runs `next build`, keeps only what runs   |
| `.dockerignore` | Keeps `node_modules`, `.next`, the local database etc. out of builds  |
| `app.json`      | Health check: Dokku waits for `/api/up` before switching traffic      |

The database is **not** inside the image. It lives in a folder on the server that is
mounted into every container, so it survives deploys and restarts.

### First deployment

`$` lines run **on the server** (`ssh root@188.34.184.8`), `%` lines **on your Mac**
in this project folder. Don't type the `$` or `%`.

**1. Check Dokku** (on the server)

```
$ dokku version
$ dokku plugin:list            # dokku-letsencrypt should be listed (your other apps use it)
```

**2. Create the app**

```
$ dokku apps:create pablo
```

**3. Create the folder for the database and mount it into the app**

The container runs as uid 1000 (`--chown heroku` means 1000:1000).

```
$ dokku storage:ensure-directory --chown heroku pablo
$ dokku storage:mount pablo /var/lib/dokku/data/storage/pablo:/app/data
```

The first line creates `/var/lib/dokku/data/storage/pablo`. (Newer Dokku releases also
have `dokku storage:create pablo --chown heroku`; the server runs 0.37.2, which doesn't.)

**4. Set the domain and the branch Dokku deploys**

```
$ dokku domains:set pablo pablo.webiky.online
$ dokku git:set pablo deploy-branch main
```

**5. Add the Dokku remote and push** (on your Mac)

```
% git remote add dokku dokku@188.34.184.8:pablo
% git push dokku main
```

If the push says `Permission denied`, your Mac's SSH key isn't added to Dokku yet:
`dokku ssh-keys:list` on the server shows the keys it accepts.

Only committed code is deployed. The first build takes a few minutes; you'll see
`npm ci`, `next build`, then the `/api/up` health check passing. (`next build` needs
roughly 1–2 GB of free memory; if the build stops with `Killed`, the server ran out.)
Check it:

```
% curl http://pablo.webiky.online/api/up        # → ok
```

Don't sign in yet: webiky.online tells browsers to use HTTPS for all its subdomains,
and the session cookie only works over HTTPS.

**6. Turn on HTTPS** (on the server)

```
$ dokku letsencrypt:enable pablo
$ dokku letsencrypt:cron-job --add      # auto-renewal; harmless if already added
```

If it asks for an email: `dokku letsencrypt:set pablo email you@example.com`, then
enable again.

**7. Create your account**

```
$ dokku run pablo npm run user:create -- you@example.com
```

It asks for the password twice (at least 8 characters). Run it again with the same
email to change the password.

**8. Open it on the iPhone**

Open **https://pablo.webiky.online** in Safari, sign in, then Share → **Add to Home
Screen**. Offline mode works from there on.

### Deploying changes

Commit, then:

```
% git push dokku main
```

Dokku builds the new image, waits for `/api/up` and then switches over, so the old
version keeps serving until the new one is ready.

### Useful commands (on the server)

| Command                          | What it shows / does                                    |
| -------------------------------- | ------------------------------------------------------- |
| `dokku logs pablo -t`           | Live app logs                                           |
| `dokku ps:report pablo`         | Whether it's running, restarts                          |
| `dokku ports:report pablo`      | Port mapping, expect `http:80:5000 https:443:5000`      |
| `dokku storage:report pablo`    | The `/app/data` mount                                   |
| `dokku ps:restart pablo`        | Restart the container                                   |
| `dokku letsencrypt:list`         | Certificates and when they expire                       |

### Backups

Everything is in one file: `/var/lib/dokku/data/storage/pablo/pablo.sqlite`. To
copy it safely while the app runs (needs `apt install sqlite3` once):

```
$ mkdir -p /root/backups
$ sqlite3 /var/lib/dokku/data/storage/pablo/pablo.sqlite ".backup '/root/backups/pablo-$(date +%F).sqlite'"
```

Put that line in `crontab -e` (with `%` written as `\%` there) for a daily backup, and
copy the backups off the server now and then.

### Testing on your phone without deploying

`npm run dev -- -H 0.0.0.0`, then open `http://<your-mac-ip>:3000` on the phone.
Everything works except offline mode, because iOS only allows service workers on
HTTPS.
