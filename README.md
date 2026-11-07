# Repair Assistant (MVP, phase 1)

Next.js 14 + TypeScript + Tailwind + MySQL. Uses the Anthropic API for diagnosis and photo reading, and Brave or Tavily for live documentation search.

## What phase 1 includes
- Product selection (category, brand, model with autocomplete, capacity, problem type, description, error code)
- Manual model entry, always marked "unverified" unless found in your catalog or matched to official documentation
- Live search for manuals and support pages, ranked: exact service manual, exact user manual, manufacturer support, same-model third party, other
- AI diagnosis that asks questions first, then gives causes (not confirmed) and step-by-step checks
- Backend safety classifier that blocks high-risk steps no matter what the AI writes, plus stop-use warnings for smoke, sparks, gas, shock
- Citations only from real search results; evidence level is capped by what the sources support
- Photo upload that reads model labels and error codes, and asks you to confirm
- Saved sessions in MySQL, tick-off steps, print/save as PDF, dark mode, mobile-first layout

## Not in phase 1 (planned next)
Admin dashboard and roles, user accounts and repair history, PDF manual ingestion with embeddings (vector search), background link refresh, Dhivehi translation, error-code lookup page, manual library page.
Right now answers are grounded in **search excerpts**, not full manual text.

## Keys you must provide
| Setting | Where to get it |
|---|---|
| `DATABASE_URL` | Hostinger hPanel > Databases > MySQL |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `BRAVE_API_KEY` (or `TAVILY_API_KEY` with `SEARCH_PROVIDER=tavily`) | brave.com/search/api or tavily.com |

Copy `.env.example` to `.env.local` for local use. On the host, set the same names as environment variables. Never commit real keys.

## Local run
```
npm install
mysql -u USER -p DB_NAME < db/schema.sql (optional: the app also creates the tables itself on first start)
npm run dev
```
Open http://localhost:3000 and check http://localhost:3000/api/health (shows which settings are present).

## Tests
```
npm test
```
Runs unit tests for the safety classifier, source ranking and evidence clamping (Node 22.6+).
`npm run typecheck` runs the TypeScript compiler.

## Deploy on Hostinger (Node.js hosting)
Use a Hostinger plan that supports Node.js web apps (Business/Cloud). Ordinary shared PHP hosting cannot run this.
1. Create a MySQL database in hPanel and import `db/schema.sql` (phpMyAdmin > Import).
2. Create a Node.js web app and connect this project (GitHub repo or ZIP upload).
3. Build command: `npm install && npm run build`. Start command: `npm start`. Node version 20 or 22.
4. Add the environment variables from the table above.
5. Open `/api/health`, then try a search at `/troubleshoot`.

## Safety notes
- API keys stay on the server; the browser never sees them.
- Search results and user text are passed to the AI as data with an instruction to ignore embedded commands.
- Uploads: JPEG/PNG/WebP only, 4 MB max, file signature checked.
- Rate limit is in memory (per process). Use a shared store if you run several instances.
- Model answers are guidance, not a substitute for a technician.
