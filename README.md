# Gin Rummy Score Pad

A score pad for gin rummy as an offline-capable PWA. Track hands, undo/edit them, and see running scores and stats across games. Localized (en / de / ru), installable on your phone.

**Live:** https://dennis-brutski.github.io/gin-rummy-score-pad/

## Development

```sh
npm ci
npm run build   # bundles src/ + public/ into dist/ via esbuild
npm test        # unit tests (node --test)
npm run e2e     # Playwright end-to-end tests
```

Built with React 19 and esbuild — no framework beyond that. Pushing to `master` deploys to GitHub Pages via `.github/workflows/pages.yml`.
