# Deploying QazoTrack

The app is a static Vite build with no server of its own. `npm run build` writes `dist/`,
and that directory is the whole site. Accounts and saved records live in Appwrite.

## The Appwrite project

| | |
| --- | --- |
| Project | QazaTrack — `6a7d8102003bcdb355c1` |
| Endpoint | `https://fra.cloud.appwrite.io/v1` (Frankfurt) |
| Database | `qazotrack` |
| Table | `records` |

The project name is **QazaTrack** while this app is **QazoTrack**. They differ by one vowel
and the console shows the project name, so check the ID rather than the name.

### The records table

One row per reader, with the row ID set to that reader's Appwrite user ID. All four columns
are nullable and hold JSON strings, as they held TEXT before.

| Column | Type | Why |
| --- | --- | --- |
| `profile` | Text | Small and fixed in shape |
| `targets` | Text | One number per prayer |
| `counts` | Text | One number per prayer |
| `history` | **Longtext** | One entry per day with activity. Text caps at 16,383 characters, which a reader would pass inside a year. |

### Permissions

Two settings work together, and the rows are readable by anyone signed in if either is
wrong:

- **Table permissions**: role `Users` has **Create** only.
- **Row security**: **on**.

Read, update and delete are deliberately not granted at the table level. `putState` writes
`Permission.read/update/delete(Role.user(id))` when it upserts, so a row names its own
reader and nobody else — including other signed-in accounts — can read it.

## Environment

Both variables are public. They are compiled into the JavaScript the browser downloads and
neither authorises anything on its own; the per-row permissions are what protect data.

```
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6a7d8102003bcdb355c1
```

Copy `.env.example` to `.env` for local work. Appwrite Sites sets the same two on the site,
and `npm run dev` talks to the same hosted backend — there is no local server any more, so
development and production share one database.

## Site build settings

Deployment is wired to GitHub: pushing to `main` on
[`javlonbeckuz/qazotrack`](https://github.com/javlonbeckuz/qazotrack) rebuilds the site.

| Field | Value |
| --- | --- |
| Framework | React |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `./dist` |
| Fallback file | `index.html` |

The fallback matters: routing is client-side via wouter, so a deep link like `/stats` has no
file of its own and must be served `index.html`.

## Deploying a change

```bash
npm run check && npm run build   # verify locally first
git push origin main             # Appwrite rebuilds
```

## Sessions

The Web SDK keeps the session where page script can read it, because the site and the
Appwrite API are on different domains and a cookie cannot be shared between them. Before the
move to Appwrite the session was an httpOnly cookie that script could not touch. Serving the
app from a custom domain that shares a root with the API would restore that.
