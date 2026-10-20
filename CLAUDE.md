# Job Search Tracker

## Checks

Wherever a skill says to typecheck, run `npm run check`: TypeScript, ESLint (whose React rules catch what tsc misses, such as a component defined inside another) and Prettier, as CI runs them.

Wherever a skill asks which seams to test, they are agreed: the ones in `CODING_STANDARDS.md` § Tests.

Compare a branch with `origin/main` after `git fetch` (for diffs, reviews and `--changed`), as CI does: PRs merge on GitHub, so local `main` falls behind.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
