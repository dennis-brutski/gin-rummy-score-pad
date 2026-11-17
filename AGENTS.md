# Working in this repo

Gin Rummy Score Pad: an offline-capable PWA for scoring two-player gin rummy.
React 19, bundled with esbuild, deployed to GitHub Pages on every push to `master`.

## Commands

```sh
npm ci
npm run build   # src/ + public/ → dist/
npm test        # unit and behaviour tests (node --test)
npm run e2e     # builds, then Playwright end-to-end tests
```

`npm test` and `npm run e2e` must both pass before any change is done.

## Where things go

| Path | What |
|---|---|
| `src/state.js` | All game logic, scoring, statistics, persistence and backup. Pure functions, no React. |
| `src/screens-*.jsx`, `src/ui.jsx`, `src/app.jsx` | React screens and shared UI pieces. |
| `src/i18n.js` | Every user-facing string, in all 9 languages. |
| `src/styles.css` | All styles. |
| `public/` | Static files copied to `dist/` as they are: `index.html`, `manifest.json`, `sw.js`, fonts, icons. |
| `test/unit/` | One file per area of `state.js` / `i18n.js`. |
| `test/behavior/` | Multi-step game flows through `state.js`. |
| `e2e/` | Playwright specs against the built app; shared steps in `e2e/helpers.js`. |
| `handoff/` | The original prototype. Frozen reference — never edit it. (inferred — Dennis to confirm) |

## Rules

1. **Test first.** Write a failing test, see it fail, then write the code. Logic gets a unit test in `test/unit/`; anything the user sees or taps gets or extends an e2e spec.
2. **Logic stays out of components.** Scoring, rules and data changes go in `src/state.js` as pure functions that return new objects; components call them. (inferred — Dennis to confirm)
3. **Every string goes through `src/i18n.js`, in all 9 languages** (en, de, ru, es, fr, pt, it, zh, ja). No hard-coded UI text in components. Plurals are functions, as the existing entries show.
4. **No new dependencies.** React and esbuild only; Playwright for tests. Prefer the platform (CSS, native inputs, Web APIs).
5. **Stored data must keep loading.** Games live in `localStorage`; a change to the stored shape needs a migration and a test in `test/unit/persistence.test.js` or `backup.test.js`. (inferred — Dennis to confirm)
6. **Every game keeps its own copy of the rules.** Changing rules must never alter finished games.
7. **Offline first.** No network requests at runtime. A new static file must be added to the `CORE` list in `public/sw.js`, or it will not work offline. (inferred — Dennis to confirm)
8. **Do not edit existing tests to make them pass.** If a test is wrong, say so and stop. Do not touch `.github/`, `playwright.config.js` or `package.json` as part of a feature.
9. **Small, readable changes.** Match the style of the file you are in. No drive-by refactors.

## Commits

- Short imperative subject, as in the history: "Show hand-by-hand history on the winner screen".
- No trailers of any kind: no co-author lines, no "generated with", no session links.
- Dennis commits on `master` himself. Software-factory agents commit their own work on `factory/issue-<n>` branches; nothing else commits.
