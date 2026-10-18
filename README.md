# Job Search Tracker

A local-first tracker for a job search: the Roles you're pursuing, the Companies and Contacts around them, and how each one is going. Vocabulary follows [`GLOSSARY.md`](GLOSSARY.md); architecture decisions are in [`docs/adr/`](docs/adr/).

Live app: <https://browniewell.github.io/job-search-tracker/>

## Where your data lives

**Only in your browser.** There is no server and no account. Everything is stored in your browser's IndexedDB for this site, so:

- Nobody else, including the site's author, can see your data.
- It does not sync between browsers or devices.
- Clearing site data for this site (or your browser evicting storage) deletes it. JSON backup and restore is planned for v1.

## Local setup

Requires Node 24 or later.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually <http://localhost:5173>).

## Running checks

| Command             | What it does                                                                |
| ------------------- | --------------------------------------------------------------------------- |
| `npm run lint`      | ESLint and a Prettier format check                                          |
| `npm run format`    | Rewrite files with Prettier                                                 |
| `npm run typecheck` | TypeScript, no emit                                                         |
| `npm run check`     | Typecheck and ESLint together: the quick check while working                |
| `npm test`          | Vitest: data-layer tests in Node, UI tests in jsdom, both on fake-indexeddb |
| `npm run test:e2e`  | Playwright smoke test against the production build                          |
| `npm run build`     | Production build into `dist/`                                               |

Before the first Playwright run, install its browser once:

```bash
npx playwright install chromium
```

## How the code is organised

- `src/data/` is the data layer, the only code allowed to import Dexie (ADR-0002, enforced by ESLint). The UI calls its domain operations, such as `createRole`, and never touches tables. It takes "now" from an injected clock so timestamps are deterministic in tests.
- `src/` outside `data/` is the React UI, routed with hash URLs so deep links work on GitHub Pages.
- `e2e/` holds Playwright tests.

## Deployment

GitHub Actions runs lint, typecheck, Vitest, Playwright and the build on every push. Pushes to `main` deploy `dist/` to GitHub Pages (ADR-0003).
