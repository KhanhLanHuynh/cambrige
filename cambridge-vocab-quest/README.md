# Cambridge Vocab Quest

A privacy-first vocabulary learning MVP for Cambridge Starters, Movers, and
Flyers learners. It includes a gamified learner hub, Word Explorer quizzes,
adult analytics, curriculum controls, and offline-friendly caching.

## Requirements

- Node.js 24 or newer
- npm 11 or newer

## Run locally

```bash
npm install
npm run seed
npm run dev
```

The web app runs at `http://localhost:5173` and proxies `/api` requests to the
file-backed API at `http://localhost:3001`. Vite also listens on the LAN; other
devices on the same Wi-Fi should open `http://<this-pc-ip>:5173` (not port
3001). Allow Node.js / TCP 5173 in Windows Firewall if the page does not load.

The seed command creates a demo adult account and learner profile. See the
terminal output from `npm run seed` for the current demo credentials.

Parent accounts are host-provisioned only. The auth UI is sign-in only; use the
CLI scripts below to create parents or reset passwords on the host.

```bash
npm run parent:create -- --name "Jamie" --email parent@example.com --password "A-secure-password1"
npm run parent:reset-password -- --email parent@example.com --password "NewSecurePass1!"
```

## Commands

- `npm run dev` — run the web app and API together
- `npm run dev:web` — run only Vite
- `npm run dev:api` — run only the JSON API
- `npm run seed` — reset local demo data
- `npm run parent:create` — create a parent account in the data store
- `npm run parent:reset-password` — reset a parent password (clears their sessions)
- `npm run typecheck` — check TypeScript
- `npm run lint` — run Oxlint
- `npm test` — run unit, component, and API tests
- `npm run build` — create the production web bundle

## Storage and backups

Runtime data is stored as JSON in `server/data` by default (`DATA_FILE`).
Writes are serialized and replace files atomically. Set `DATA_BACKEND=sqlite`
(or point `DATA_FILE` at a `.sqlite` / `.db` path) to use the SQLite-backed
store, which keeps the same document model with WAL locking.

To back up the MVP, stop the API and copy that directory. Running
`npm run seed` resets the local data.

JSON / SQLite document persistence is intentionally limited to a single API
process. It is useful for local pilots and demos, but it is not suitable for
multi-instance deployment or high write concurrency.

## Environment

- `CORS_ORIGINS` — comma-separated allowed origins (default `http://localhost:5173,http://127.0.0.1:5173`). When unset, private LAN origins on ports 5173 and 4173 are also allowed.
- `COOKIE_SECURE=true` — force Secure cookies (also on when `NODE_ENV=production`)
- `DATA_BACKEND=json|sqlite` — persistence backend
- `DATA_FILE` — path to JSON or SQLite file
- `SEED_ON_START=true` — seed demo account when the API boots

## Privacy and security assumptions

- Learner records contain handles, avatar choices, PIN hashes, progress, and
  settings—not child email addresses, full names, ages, or phone numbers.
- Adult passwords and learner PINs are stored as salted hashes.
- Adult sessions use HTTP-only cookies.
- Adult-only actions are checked by the API; hiding controls in the browser is
  not treated as authorization.
- There are no public social or messaging features.

For production, deploy behind HTTPS, set a strong cookie secret, restrict the
allowed origin, back up JSON data securely, and replace the file store before
scaling beyond one server process.

## Content assets

The MVP uses local vector/CSS placeholders and browser speech synthesis.
Licensed Cambridge-aligned illustrations and native-speaker audio should be
placed in `public/assets/images` and `public/assets/audio` before release.
